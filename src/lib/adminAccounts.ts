// Admin account management for mainnet login flow
export interface AdminAccount {
  username: string;
  name: string;
  tempPassword: string;
  isSetup: boolean;
  email?: string;
  password?: string;
  failedAttempts: number;
}

const STORAGE_KEY = "tl_admin_accounts";

const DEFAULT_ACCOUNTS: AdminAccount[] = [
  { username: "michael.tl", name: "Michael", tempPassword: "Mk7$xPq2", isSetup: false, failedAttempts: 0 },
  { username: "david.tl", name: "David", tempPassword: "Dv9#nRw4", isSetup: false, failedAttempts: 0 },
  { username: "emmanuel.tl", name: "Emmanuel", tempPassword: "Em3&jLs8", isSetup: false, failedAttempts: 0 },
];

export function getAdminAccounts(): AdminAccount[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
  return [...DEFAULT_ACCOUNTS];
}

export function saveAdminAccounts(accounts: AdminAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function isValidAdminUsername(username: string): boolean {
  const accounts = getAdminAccounts();
  return accounts.some(a => a.username === username.toLowerCase().trim());
}

export function findAdminByUsernameOrEmail(identifier: string): AdminAccount | null {
  const accounts = getAdminAccounts();
  const id = identifier.toLowerCase().trim();
  return accounts.find(a => a.username === id || (a.email && a.email.toLowerCase() === id)) || null;
}

export function verifyAdminCredentials(identifier: string, password: string): { success: boolean; needsSetup: boolean; account: AdminAccount | null; locked: boolean } {
  const accounts = getAdminAccounts();
  const id = identifier.toLowerCase().trim();
  const account = accounts.find(a => a.username === id || (a.email && a.email.toLowerCase() === id));

  if (!account) return { success: false, needsSetup: false, account: null, locked: false };

  if (account.failedAttempts >= 5) {
    return { success: false, needsSetup: false, account, locked: true };
  }

  // Check temp password (first-time login)
  if (!account.isSetup && password === account.tempPassword) {
    return { success: true, needsSetup: true, account, locked: false };
  }

  // Check set password
  if (account.isSetup && account.password === password) {
    // Reset failed attempts on success
    account.failedAttempts = 0;
    saveAdminAccounts(accounts);
    return { success: true, needsSetup: false, account, locked: false };
  }

  // Failed attempt
  account.failedAttempts += 1;
  saveAdminAccounts(accounts);
  return { success: false, needsSetup: false, account, locked: account.failedAttempts >= 5 };
}

export function setupAdminAccount(username: string, email: string, newPassword: string): boolean {
  const accounts = getAdminAccounts();
  const account = accounts.find(a => a.username === username.toLowerCase().trim());
  if (!account) return false;

  account.isSetup = true;
  account.email = email.toLowerCase().trim();
  account.password = newPassword;
  account.failedAttempts = 0;
  saveAdminAccounts(accounts);
  return true;
}

export function resetAdminPassword(email: string, newPassword: string): boolean {
  const accounts = getAdminAccounts();
  const account = accounts.find(a => a.email && a.email.toLowerCase() === email.toLowerCase().trim());
  if (!account) return false;

  account.password = newPassword;
  account.failedAttempts = 0;
  saveAdminAccounts(accounts);
  return true;
}
