import { randomFromArray } from '@santi100/random-lib';
import * as express from 'express';
import {
	randomBytes,
	randomUUID,
	scryptSync,
	timingSafeEqual
} from 'node:crypto';
import { MongoClient } from 'mongodb';
import cors = require('cors');
import sum = require('@santi100/summation-lib');

console.clear();

const api = express();
api.use(cors({ origin: '*' }));
const PORT = process.env.PORT ?? 5000;

(async function main() {
	const mongoClient = new MongoClient(process.env.MONGO_URI as string);
	await mongoClient.connect();
	const db = mongoClient.db('bank');
	const usersCollection = db.collection<User>('users');
	const transactionsCollection = db.collection<Transaction>('transactions');

	let users: Record<string, User> = await retrieveUsers();
	let transactions: Transaction[] = await retrieveTransactions();

	async function retrieveUsers(): Promise<Record<string, User>> {
		const usersCursor = usersCollection.find({});
		const usersArray: User[] = await usersCursor.toArray();
		const users: Record<string, User> = {};
		usersArray.forEach((user) => {
			users[user.username] = user;
		});
		return users;
	}

	async function saveUsers(): Promise<void> {
		for (const [username, user] of Object.entries(users)) {
			await usersCollection.updateOne(
				{ username },
				{ $set: user },
				{ upsert: true }
			);
		}
	}

	async function retrieveTransactions(): Promise<Transaction[]> {
		return transactionsCollection.find({}).toArray();
	}

	async function saveTransactions(): Promise<void> {
		for (const transaction of transactions) {
			await transactionsCollection.updateOne(
				{ id: transaction.id },
				{ $set: transaction },
				{ upsert: true }
			);
		}
	}

	async function createAccount(username: string): Promise<CreationOutcome> {
		if (typeof username !== 'string' || String(username).length == 0)
			return {
				status: 400,
				error: {
					code: 'INVALID_USERNAME',
					description: 'The provided username is not valid.'
				},
				result: null
			};
		const letters =
			'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split(
				''
			) as [string, ...string[]];
		const tokenString = randomFromArray(letters, 20).join('');
		const token = Buffer.from(tokenString);

		const salt = randomBytes(16);
		const hash = scryptSync(token, salt, 64);
		const newUser: User = {
			username,
			key: `${salt.toString('hex')}:${hash.toString('hex')}`,
			transaction_ids: []
		};

		const existingUser = await usersCollection.findOne({ username });
		if (existingUser)
			return {
				status: 409,
				error: {
					code: 'USERNAME_TAKEN',
					description: 'Username already taken.'
				},
				result: null
			};
		users[username] = newUser;
		await saveUsers();
		return {
			status: 200,
			result: {
				token: tokenString
			},
			error: null
		};
	}

	function processPayment(
		amount: number,
		payer: string,
		payee: string,
		payerToken: string,
		purpose = ''
	): PaymentOutcome {
		amount = Number(Number(amount).toFixed(2));
		const payerAccount = users[payer];
		const payeeAccount = users[payee];
		const id = randomUUID();
		const transaction: Transaction = {
			amount,
			payer,
			payee,
			purpose,
			id,
			status: 'pending'
		};

		if (isNaN(amount)) {
			transaction.status = 'declined';
			transaction.error = {
				code: 'BAD_AMOUNT',
				description: `Invalid amount.`
			};
			return {
				status: 400,
				transaction
			};
		}

		if (typeof payerAccount !== 'object') {
			transaction.status = 'declined';
			transaction.error = {
				code: 'NO_SUCH_PAYER',
				description: `Payer "${payer}" does not exist.`
			};
			return {
				status: 404,
				transaction
			};
		}
		if (typeof payeeAccount !== 'object') {
			transaction.status = 'declined';
			transaction.error = {
				code: 'NO_SUCH_PAYEE',
				description: `Payee "${payee}" does not exist.`
			};
			return {
				status: 404,
				transaction
			};
		}

		if (typeof amount !== 'number') {
			transaction.status = 'declined';
			transaction.error = {
				code: 'INVALID_AMOUNT',
				description: 'Amount must be a number.'
			};
			return {
				status: 403,
				transaction
			};
		}

		if (amount <= 0) {
			transaction.status = 'declined';
			transaction.error = {
				code: 'INVALID_AMOUNT',
				description: 'Amount must be greater than zero.'
			};
			return {
				status: 403,
				transaction
			};
		}
		if (calculateBalance(payerAccount) < amount) {
			transaction.status = 'declined';
			transaction.error = {
				code: 'INSUFFICIENT_FUNDS',
				description: `Payer "${payer}" does not have enough funds.`
			};
			saveTransactions();
			return {
				status: 403,
				transaction
			};
		}
		if (payer === payee) {
			transaction.status = 'declined';
			transaction.error = {
				code: 'SELF_TRANSACTION',
				description: `Cannot send funds to oneself.`
			}
			return {
				status: 403,
				transaction
			}
		}
		if (login(payer, payerToken)) {
			// Authorize transaction
			transaction.status = 'approved';
			transaction.error = null;
			payerAccount.transaction_ids = [...payerAccount.transaction_ids, id];
			payeeAccount.transaction_ids = [...payeeAccount.transaction_ids, id];
			
			transactions.push(transaction);
			saveUsers();
			saveTransactions();

			return {
				status: 200,
				transaction
			};
		} else {
			transaction.status = 'declined';
			transaction.error = {
				code: 'UNAUTHORIZED_TRANSACTION',
				description: 'Incorrect credentials.'
			};
			saveTransactions();
			return {
				status: 401,
				transaction
			};
		}
	}
	function calculateBalance(user: User): number {
		if (user.username === 'admin') return Infinity;
		const transactionObjects: Transaction[] = [];
		user.transaction_ids.forEach((transactionId) => {
			transactionObjects.push(transactions.find(trans => trans.id === transactionId)!);
		});
		const debitsAndCredits = transactionObjects.map(trans => trans.payer === user.username ? -trans.amount : trans.amount);
		return Number(sum(debitsAndCredits).toFixed(2));
	}

	api.use(express.json());

	api.post('/new-bank-account', async (request, response) => {
		const outcome = await createAccount(request.body?.username);
		return response.status(outcome.status).json(outcome);
	});
	api.post('/send-money', (request, response) => {
		const [, encodedAuth] = String(request.headers['authorization']).split(' ');

		if (typeof encodedAuth !== 'string')
			response.status(400).json({
				status: 400,
				error: {
					code: 'INVALID_AUTH',
					description: 'Invalid Authorization header.'
				}
			});
		const digestedAuth = Buffer.from(encodedAuth, 'base64').toString('ascii');
		const [username, token] = digestedAuth.toString().split(':');
		const outcome = processPayment(
			request.body?.amount,
			username,
			request.body?.payee,
			token,
			request.body?.purpose
		);
		return response.status(outcome.status).json(outcome);
	});

	function login(user: string, token: string) {
		const [saltString, hashString] = users[user].key.split(':');
		const salt = Buffer.from(saltString, 'hex');
		const expectedHash = Buffer.from(hashString, 'hex');
		const receivedHash = scryptSync(token, salt, 64);
		return timingSafeEqual(expectedHash, receivedHash);
	}

	api.delete('/delete-account', async (request, response) => {
		const [, encodedAuth] = String(request.headers.authorization).split(' ');

		if (typeof encodedAuth !== 'string')
			return response.status(400).json({
				status: 400,
				error: {
					code: 'INVALID_AUTH',
					description: 'Invalid Authorization header.'
				}
			});

		const digestedAuth = Buffer.from(encodedAuth, 'base64').toString('ascii');
		const [username, token] = digestedAuth.toString().split(':');

		if (!users[username])
			return response.status(404).json({
				status: 404,
				error: {
					code: 'NO_SUCH_USER',
					description: `Cannot find user "${username}".`
				}
			});
		if (!login(username, token))
			return response.status(401).json({
				status: 401,
				error: {
					code: 'INVALID_CREDENTIALS',
					description: 'Invalid credentials.'
				}
			});

		delete users[username];
		await usersCollection.deleteOne({ username });
		await saveUsers();

		return response.status(204).end();
	});

	api.get('/my-info', async (request, response) => {
		const [, encodedAuth] = String(request.headers['authorization']).split(' ');

		if (typeof encodedAuth !== 'string')
			return response.status(400).json({
				status: 400,
				error: {
					code: 'INVALID_AUTH',
					description: 'Invalid Authorization header.'
				}
			});

		const digestedAuth = Buffer.from(encodedAuth, 'base64').toString('ascii');
		const [user, token] = digestedAuth.toString().split(':');
		if (typeof users[user] != 'object') {
			return response.status(404).json({
				status: 404,
				error: {
					code: 'NO_SUCH_USER',
					description: `Cannot find user "${user}".`
				}
			});
		}
		const [saltString, hashString] = users[user].key.split(':');
		const salt = Buffer.from(saltString, 'hex');
		const expectedHash = Buffer.from(hashString, 'hex');
		const receivedHash = scryptSync(token, salt, 64);
		const allow = timingSafeEqual(expectedHash, receivedHash);
		if (!allow) {
			return response.status(401).json({
				status: 401,
				error: {
					code: 'UNAUTHORIZED_QUERY',
					description: 'Incorrect credentials.'
				},
				result: null
			});
		}
		transactions = await retrieveTransactions();
		users = await retrieveUsers();
		return response.status(200).json({
			status: 200,
			error: null,
			result: { ...users[user], key: undefined, _id: undefined, balance: calculateBalance(users[user]) }
		});
	});

	api.get('/transaction-info', (request, response) => {
		const [, encodedAuth] = String(request.headers['authorization']).split(' ');
		if (typeof encodedAuth !== 'string')
			return response.status(400).json({
				status: 400,
				error: {
					code: 'INVALID_AUTH',
					description: 'Invalid Authorization header.'
				}
			});
		const digestedAuth = Buffer.from(encodedAuth, 'base64').toString('ascii');
		const [user, token] = digestedAuth.split(':');
		const [saltString, hashString] = users[user].key.split(':');
		const salt = Buffer.from(saltString, 'hex');
		const expectedHash = Buffer.from(hashString, 'hex');
		const receivedHash = scryptSync(token, salt, 64);
		const allow = timingSafeEqual(expectedHash, receivedHash);
		const transactionId = String(request.query.transaction_id);
		if (!allow) {
			return response.status(401).json({
				status: 401,
				error: {
					code: 'UNAUTHORIZED_QUERY',
					description: 'Incorrect credentials.'
				},
				result: null
			});
		}
		const isOwnTransaction = users[user].transaction_ids.includes(
			transactionId
		);
		const transaction = transactions.find(
			(transaction) => transaction.id == transactionId
		);

		if (!isOwnTransaction || transaction == undefined) {
			return response.status(404).json({
				status: 404,
				error: {
					code: 'NO_SUCH_TRANSACTION',
					description: `Transaction with ID ${transactionId} could not be found.`
				}
			});
		}
		return response.status(200).json({
			status: 200,
			error: null,
			result: transaction
		});
	});

	api.listen(PORT, () =>
		console.log(
			'Express server listening on port %d in %s mode.',
			PORT,
			api.settings.env
		)
	);
})();
