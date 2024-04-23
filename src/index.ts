import { randomFromArray } from '@santi100/random-lib';
import * as express from 'express';
import {
	randomBytes,
	randomUUID,
	scryptSync,
	timingSafeEqual
} from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from 'redis';
import cors = require('cors');

console.clear();

const api = express();
api.use(cors({ origin: '*' }));
const PORT = process.env.PORT ?? 5000;
(async function main() {
	const redisClient = createClient({
		password: process.env.REDIS_TOKEN,
		socket: {
			host: process.env.REDIS_HOST,
			port: Number(process.env.REDIS_PORT)
		}
	});

	if (process.env.USE_DB == 'production')
		(async function () {
			await redisClient.connect();
		})();
	const users: Record<string, User> = await retrieveUsers();
	const transactions: Transaction[] = await retrieveTransactions();

	async function retrieveUsers(): Promise<Record<string, User>> {
		if (process.env.USE_DB === 'production') {
			return JSON.parse((await redisClient.GET('users')) ?? '{}');
		}
		return JSON.parse(readFileSync('./users.json', 'utf8'));
	}
	async function saveUsers(): Promise<void> {
		if (process.env.USE_DB === 'production') {
			await redisClient.SET('users', JSON.stringify(users));
		}
		writeFileSync('./users.json', JSON.stringify(users));
	}

	async function retrieveTransactions(): Promise<Transaction[]> {
		if (process.env.USE_DB === 'production') {
			return JSON.parse((await redisClient.GET('transactions')) ?? '{}');
		}
		return JSON.parse(readFileSync('./transactions.json', 'utf8'));
	}
	function saveTransactions(): void {
		if (process.env.USE_DB === 'production') {
			redisClient.SET('transactions', JSON.stringify(transactions));
		}
		writeFileSync('./transactions.json', JSON.stringify(transactions));
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
			balance: username == 'admin' ? 21_000_000.0 : 0.0,
			key: `${salt.toString('hex')}:${hash.toString('hex')}`,
			transaction_ids: []
		};
		if (users[username] !== undefined)
			return {
				status: 409,
				error: {
					code: 'USERNAME_TAKEN',
					description: 'Username already taken.'
				},
				result: null
			};
		users[username] = newUser;
		saveUsers();
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
			// saveTransactions();
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
			// saveTransactions();
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
			// saveTransactions();
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
			// saveTransactions();
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
			// saveTransactions();
			return {
				status: 403,
				transaction
			};
		}
		if (payerAccount.balance < amount) {
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
			payerAccount.balance = Number((payerAccount.balance - amount).toFixed(2));
			payeeAccount.balance = Number((payeeAccount.balance + amount).toFixed(2));
			transaction.status = 'approved';
			transaction.error = null;
			payerAccount.transaction_ids = [...payerAccount.transaction_ids, id];
			payeeAccount.transaction_ids = [...payeeAccount.transaction_ids, id];

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

	api.delete('/delete-account', (request, response) => {
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
		const outcome = login(username, token);
		if (!outcome)
			return response.status(401).json({
				status: 401,
				error: {
					code: 'UNAUTHORIZED_DELETION',
					description: 'Incorrect credentials.'
				}
			});
		if (users[username].balance > 0)
			return response.status(403).json({
				status: 403,
				error: {
					code: 'NONZERO_BALANCE',
					description: 'Cannot delete non-empty account.'
				}
			});
		if (username == 'admin')
			return response.status(403).json({
				status: 403,
				error: {
					code: 'DELETION_FORBIDDEN',
					description: 'Cannot delete admin account.'
				}
			});

		delete users[username];
		saveUsers();
		return response.status(204).send();
	});

	api.get('/my-info', (request, response) => {
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
			return response.status(401).json({
				status: 401,
				error: {
					code: 'UNAUTHORIZED_QUERY',
					description: 'Incorrect credentials.'
				},
				result: null
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
		return response.status(200).json({
			status: 200,
			error: null,
			result: { ...users[user], key: undefined }
		});
	});

	api.get('/transaction-info', (request, response) => {
		const [, encodedAuth] = String(request.headers['authorization']).split(' ');
		const digestedAuth = Buffer.from(encodedAuth, 'base64').toString('ascii');
		const [user, token] = digestedAuth.toString().split(':');
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
		const isOwnTransaction = users[user].transaction_ids.includes(
			request.body.transaction_id
		);
		const transaction = transactions.find(
			(transaction) => transaction.id == request.body.transaction_id
		);

		if (!isOwnTransaction || transaction == undefined) {
			return response.status(404).json({
				status: 404,
				error: {
					code: 'NO_SUCH_TRANSACTION',
					description: `Transaction with ID ${request.body.transaction_id} could not be found.`
				}
			});
		}
		return response.status(200).json({
			status: 200,
			error: null,
			result: transaction
		});
	});
	api.use((request, response, next) => {
		response.status(404).json({
			status: 404,
			error: {
				code: 'NO_SUCH_RESOURCE',
				description: `Resource "${request.url}" wasn't found.`
			}
		});
		next();
	});
	api.use((_, response, next) => {
		response.status(500).json({
			status: 500,
			error: {
				code: 'SERVER_ERROR',
				description: `Something went wrong. Try again or contact <santyrojasprieto9+api@gmail.com>.`
			}
		});
		next();
	});
	api.listen(PORT, () => console.log('Ready on http://127.0.0.1:%d/', PORT));
})();
