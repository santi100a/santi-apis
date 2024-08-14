type TransactionStatus = 'approved' | 'pending' | 'declined';

interface User {
    readonly username: string;
    balance: number | 'Infinity';
    readonly key: string;
    transaction_ids: string[];
}
interface Transaction {
    readonly id: string;
    readonly amount: number;
    readonly payer: string;
    readonly payee: string;
    readonly purpose: string;
    status: TransactionStatus;
    error?: TransactionError | null;
}
interface TransactionError {
    readonly code: string;
    readonly description: string;
}
interface PaymentOutcome {
    readonly status: number;
    readonly transaction: Transaction | null;
}
interface CreationOutcome {
    readonly status: number;
    result: { token: string } | null;
    error: TransactionError | null;
}