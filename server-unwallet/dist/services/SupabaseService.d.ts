import { SupabaseClient } from '@supabase/supabase-js';
import { UserRecord, StealthAddressRecord } from '../types';
export declare class SupabaseService {
    private client;
    constructor();
    getClient(): SupabaseClient;
    healthCheck(): Promise<boolean>;
    createUser(userData: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord>;
    getUserByUsername(username: string): Promise<UserRecord | null>;
    getUserByEmail(email: string): Promise<UserRecord | null>;
    getUserByApiKey(apiKey: string): Promise<UserRecord | null>;
    getUserByEOA(eoaaddress: string): Promise<UserRecord | null>;
    checkEmailExists(email: string): Promise<boolean>;
    checkUsernameExists(username: string): Promise<boolean>;
    incrementUserNonce(userId: string): Promise<number>;
    insert<T>(table: string, data: Partial<T>): Promise<T>;
    findById<T>(table: string, id: string | number): Promise<T>;
    createStealthAddress(stealthAddressData: Omit<StealthAddressRecord, 'id' | 'generatedAt' | 'lastCheckedAt'>): Promise<StealthAddressRecord>;
    getStealthAddressesByUser(userId: string): Promise<StealthAddressRecord[]>;
    getStealthAddressByNonce(userId: string, nonce: number): Promise<StealthAddressRecord | null>;
    updateStealthAddressSafeStatus(id: string, safeDeployed: boolean, safeFunded: boolean): Promise<StealthAddressRecord>;
    getStealthAddressesNeedingStatusCheck(olderThanMinutes?: number): Promise<StealthAddressRecord[]>;
    getStealthAddressByPaymentAddress(paymentAddress: string): Promise<StealthAddressRecord | null>;
    updateStealthAddressFundingStatus(id: string, safeFunded: boolean): Promise<StealthAddressRecord>;
    updateStealthAddressFundingAndTx(id: string, funded: boolean, fromAddress: string, transactionHash: string): Promise<void>;
    getUserFundingStats(userId: string): Promise<{
        totalGenerated: number;
        totalFunded: number;
        fundedPercentage: number;
        fundedAddresses: StealthAddressRecord[];
    }>;
    getStealthAddressesByFundingStatus(userId: string, safeFunded: boolean): Promise<StealthAddressRecord[]>;
}
//# sourceMappingURL=SupabaseService.d.ts.map