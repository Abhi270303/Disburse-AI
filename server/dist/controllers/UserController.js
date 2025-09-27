"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const UserService_1 = require("../services/UserService");
const SupabaseService_1 = require("../services/SupabaseService");
const StealthAddressService_1 = require("../services/StealthAddressService");
const SafeService_1 = require("../services/SafeService");
const utils_1 = require("../utils");
const chains_1 = require("../config/chains");
class UserController {
    constructor() {
        // Register new user
        this.registerUser = async (req, res, next) => {
            try {
                const registrationData = req.body;
                if (!registrationData.eoaaddress) {
                    utils_1.ResponseUtil.error(res, 'eoaaddress is required for onchain login', 400);
                    return;
                }
                utils_1.Logger.info('User registration request received', {
                    email: registrationData.email,
                    username: registrationData.username,
                    eoaaddress: registrationData.eoaaddress,
                    chainsCount: registrationData.chains?.length || 0
                });
                const result = await this.userService.registerUser(registrationData);
                // Generate JWT token for the new user
                const user = await this.userService.getUserByUsername(result.user.username);
                if (!user) {
                    throw new Error('Failed to retrieve created user');
                }
                const token = this.userService.generateToken(user);
                // Generate a test stealth address to validate the setup
                let testStealthAddress = null;
                try {
                    // Validate that user has chains and tokens configured
                    if (!user.chains || user.chains.length === 0) {
                        throw new Error('No chains configured for user');
                    }
                    const firstChain = user.chains[0];
                    if (!firstChain.tokenAddresses || firstChain.tokenAddresses.length === 0) {
                        throw new Error('No token addresses configured for the first chain');
                    }
                    const firstTokenAddress = firstChain.tokenAddresses[0];
                    utils_1.Logger.info('Generating test stealth address for new user', {
                        userId: user.id,
                        username: user.username,
                        chainId: firstChain.chainId,
                        tokenAddress: firstTokenAddress,
                        currentNonce: user.currentNonce
                    });
                    // Generate exactly 1 test stealth address
                    const serviceResponse = await this.stealthAddressService.computeStealthAddresses({
                        viewingPrivateKey: user.viewingPrivateKey,
                        spendingPublicKey: user.spendingPublicKey,
                        startNonce: user.currentNonce.toString(),
                        accountAmount: "1", // Always generate exactly 1 address
                        chainId: firstChain.chainId
                    });
                    // Increment user's nonce since we generated an address
                    const newNonce = await this.userService.incrementNonce(user.id);
                    const generatedAddress = serviceResponse.addresses[0];
                    if (generatedAddress) {
                        // Predict Safe address for the test stealth address
                        let safeAddressInfo = undefined;
                        try {
                            utils_1.Logger.info('Predicting Safe address for test stealth address', {
                                stealthAddress: generatedAddress.address,
                                chainId: firstChain.chainId
                            });
                            // Create SafeService instance with the correct chain configuration
                            const rpcUrl = this.getRpcUrlForChain(firstChain.chainId);
                            const safeService = new SafeService_1.SafeService(firstChain.chainId, rpcUrl);
                            const safeResults = await safeService.predictSafeAddressOnTheBasisOfStealthAddress([generatedAddress.address]);
                            if (safeResults && safeResults.length > 0) {
                                const safeResult = safeResults[0];
                                if (safeResult) {
                                    safeAddressInfo = {
                                        address: safeResult.safeAddress,
                                        isDeployed: safeResult.isDeployed,
                                        ...(safeResult.error && { error: safeResult.error })
                                    };
                                    utils_1.Logger.info('Safe address predicted for test stealth address', {
                                        stealthAddress: generatedAddress.address,
                                        safeAddress: safeResult.safeAddress,
                                        isDeployed: safeResult.isDeployed
                                    });
                                }
                            }
                        }
                        catch (safeError) {
                            utils_1.Logger.error('Failed to predict Safe address for test stealth address', {
                                error: safeError,
                                stealthAddress: generatedAddress.address,
                                userId: user.id
                            });
                            // Don't fail registration if Safe prediction fails
                        }
                        // Store the test stealth address in the database
                        try {
                            const stealthAddressData = {
                                userId: user.id,
                                nonce: user.currentNonce,
                                stealthAddress: generatedAddress.address,
                                safeDeployed: safeAddressInfo?.isDeployed || false,
                                safeFunded: false, // Default to false for new addresses
                                chainId: firstChain.chainId,
                                chainName: firstChain.name || `Chain ${firstChain.chainId}`,
                                tokenAddress: firstTokenAddress,
                                tokenAmount: "1.0",
                                ...(safeAddressInfo?.address && { safeAddress: safeAddressInfo.address })
                            };
                            const stealthAddressRecord = await this.supabaseService.createStealthAddress(stealthAddressData);
                            utils_1.Logger.info('Test stealth address stored in database', {
                                recordId: stealthAddressRecord.id,
                                userId: user.id,
                                stealthAddress: generatedAddress.address,
                                safeAddress: safeAddressInfo?.address
                            });
                        }
                        catch (dbError) {
                            utils_1.Logger.error('Failed to store test stealth address in database', {
                                error: dbError,
                                userId: user.id,
                                stealthAddress: generatedAddress.address
                            });
                            // Don't fail registration if database storage fails
                        }
                        testStealthAddress = {
                            address: generatedAddress.address,
                            chainId: firstChain.chainId,
                            chainName: firstChain.name || `Chain ${firstChain.chainId}`,
                            tokenAddress: firstTokenAddress,
                            tokenAmount: "1.0", // Default test amount
                            nonce: newNonce - 1, // The nonce used for this address
                            newNonce: newNonce, // Updated nonce for next generation
                            ...(safeAddressInfo && { safeAddress: safeAddressInfo })
                        };
                        utils_1.Logger.info('Test stealth address generated successfully', {
                            userId: user.id,
                            username: user.username,
                            address: generatedAddress.address,
                            chainId: firstChain.chainId,
                            newNonce,
                            safeAddress: safeAddressInfo?.address
                        });
                    }
                }
                catch (stealthError) {
                    utils_1.Logger.error('Failed to generate test stealth address', {
                        error: stealthError,
                        userId: user.id,
                        username: user.username
                    });
                    // Don't fail the registration if stealth address generation fails
                    // Just log the error and continue
                }
                // Create conditional instructions based on user type
                const instructions = {
                    token: 'Use this JWT token in the Authorization: Bearer <token> header for profile access',
                    endpoint: `Your custom endpoint: /api/user/${result.user.username}/stealth`,
                    note: result.user.isMerchant
                        ? 'As a merchant, you have API key access for profile management'
                        : 'As a regular user, you can generate stealth addresses without authentication',
                    supportedChains: result.user.chains.map(chain => ({
                        chainId: chain.chainId,
                        tokenCount: chain.tokenAddresses.length,
                        name: chain.name
                    })),
                    testAddress: testStealthAddress ? 'Test stealth address generated successfully - your setup is working!' : 'Test stealth address generation failed - please check your keys and chain configuration'
                };
                // Add API key instructions only for merchants
                if (result.user.isMerchant && result.user.apiKey) {
                    instructions.apiKey = 'Use this API key in the X-API-Key header for profile access';
                }
                utils_1.ResponseUtil.success(res, {
                    ...result,
                    token,
                    testStealthAddress,
                    instructions
                }, 'User registered successfully', 201);
            }
            catch (error) {
                utils_1.Logger.error('User registration failed', { error });
                next(error);
            }
        };
        // Login user (supports EOA signature-based login only)
        this.loginUser = async (req, res, next) => {
            try {
                const { eoaaddress, message, signature } = req.body;
                if (!eoaaddress || !message || !signature) {
                    utils_1.ResponseUtil.error(res, 'eoaaddress, message, and signature are required for login', 400);
                    return;
                }
                // Find user by EOA address
                const user = await this.userService.getUserByEOA(eoaaddress);
                if (!user) {
                    utils_1.ResponseUtil.error(res, 'User not found for provided EOA address', 404);
                    return;
                }
                // Recover address from signature
                const ethers = require('ethers');
                let recoveredAddress;
                try {
                    recoveredAddress = ethers.utils.verifyMessage(message, signature).toLowerCase();
                }
                catch (err) {
                    utils_1.ResponseUtil.error(res, 'Invalid signature', 401);
                    return;
                }
                if (recoveredAddress !== user.eoaaddress.toLowerCase()) {
                    utils_1.ResponseUtil.error(res, 'Signature does not match registered EOA address', 401);
                    return;
                }
                // Generate new token
                const token = this.userService.generateToken(user);
                utils_1.Logger.info('User login successful', {
                    userId: user.id,
                    email: user.email,
                    username: user.username,
                    isMerchant: user.isMerchant,
                    eoaaddress: user.eoaaddress
                });
                utils_1.ResponseUtil.success(res, {
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        isMerchant: user.isMerchant,
                        eoaaddress: user.eoaaddress,
                        chains: user.chains.map((chain) => ({
                            chainId: chain.chainId,
                            tokenCount: chain.tokenAddresses.length,
                            name: chain.name
                        }))
                    },
                    endpoint: `/api/user/${user.username}/stealth`,
                    note: 'User login successful - onchain signature verified'
                }, 'Login successful');
            }
            catch (error) {
                utils_1.Logger.error('User login failed', { error });
                next(error);
            }
        };
        // Get user profile (requires authentication)
        this.getProfile = async (req, res, next) => {
            try {
                // This endpoint requires authentication, so user info is available in req.userRecord
                const user = req.userRecord;
                utils_1.ResponseUtil.success(res, {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    chains: user.chains,
                    currentNonce: user.currentNonce,
                    isActive: user.isActive,
                    createdAt: user.createdAt,
                    supportedChainIds: this.userService.getUserChainIds(user),
                    totalTokenAddresses: user.chains.reduce((total, chain) => total + chain.tokenAddresses.length, 0)
                }, 'Profile retrieved successfully');
            }
            catch (error) {
                utils_1.Logger.error('Failed to get user profile', { error });
                next(error);
            }
        };
        // Get username by EOA address (public endpoint)
        this.getUsernameByEOA = async (req, res, next) => {
            try {
                const { eoaaddress } = req.body;
                if (!eoaaddress) {
                    utils_1.ResponseUtil.error(res, 'eoaaddress is required', 400);
                    return;
                }
                const user = await this.userService.getUserByEOA(eoaaddress);
                if (!user) {
                    utils_1.ResponseUtil.error(res, 'User not found for provided EOA address', 404);
                    return;
                }
                utils_1.ResponseUtil.success(res, { username: user.username }, 'Username found for EOA address');
            }
            catch (error) {
                utils_1.Logger.error('Failed to get username by EOA address', { error });
                next(error);
            }
        };
        // Simple gas sponsorship request handler with actual execution
        this.gasSponsorshipRequest = async (req, res, next) => {
            try {
                const { username } = req.params;
                const { multicallData, metadata = {}, chainId: requestedChainId } = req.body;
                utils_1.Logger.info('Gas sponsorship request received', {
                    username,
                    multicallDataLength: multicallData?.length || 0,
                    metadata
                });
                if (!username) {
                    utils_1.ResponseUtil.error(res, 'Username parameter is required', 400);
                    return;
                }
                if (!multicallData || !Array.isArray(multicallData) || multicallData.length === 0) {
                    utils_1.ResponseUtil.error(res, 'Valid multicall data is required', 400);
                    return;
                }
                // Import required dependencies
                const { createWalletClient, createPublicClient, http, encodeFunctionData } = require('viem');
                const { privateKeyToAccount } = require('viem/accounts');
                // Your sponsor private key (make sure this is in your .env file)
                const SPONSOR_PRIVATE_KEY = process.env.SPONSOR_PRIVATE_KEY;
                if (!SPONSOR_PRIVATE_KEY) {
                    throw new Error('SPONSOR_PRIVATE_KEY not configured');
                }
                // Ensure private key is properly formatted
                const formattedPrivateKey = SPONSOR_PRIVATE_KEY.startsWith('0x')
                    ? SPONSOR_PRIVATE_KEY
                    : `0x${SPONSOR_PRIVATE_KEY}`;
                utils_1.Logger.info('Using sponsor private key', {
                    hasPrivateKey: !!SPONSOR_PRIVATE_KEY,
                    keyLength: SPONSOR_PRIVATE_KEY.length,
                    startsWithOx: SPONSOR_PRIVATE_KEY.startsWith('0x')
                });
                // Create sponsor account
                const sponsorAccount = privateKeyToAccount(formattedPrivateKey);
                // Multicall3 contract details (declared before any usage)
                const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';
                const MULTICALL3_ABI = [
                    {
                        inputs: [
                            {
                                components: [
                                    { name: 'target', type: 'address' },
                                    { name: 'allowFailure', type: 'bool' },
                                    { name: 'callData', type: 'bytes' },
                                ],
                                name: 'calls',
                                type: 'tuple[]',
                            },
                        ],
                        name: 'aggregate3',
                        outputs: [
                            {
                                components: [
                                    { name: 'success', type: 'bool' },
                                    { name: 'returnData', type: 'bytes' },
                                ],
                                name: 'returnData',
                                type: 'tuple[]',
                            },
                        ],
                        stateMutability: 'payable',
                        type: 'function',
                    },
                ];
                // Auto-select chain if not provided: try preflight on all supported chains and pick the first that passes
                const candidateChainIds = typeof requestedChainId === 'number' ? [requestedChainId] : chains_1.SUPPORTED_CHAINS;
                let selectedChainId = null;
                let selectedChain = null;
                let selectedRpcUrl = '';
                let publicClient = null;
                let sponsorWallet = null;
                const preflightArgsFor = (data) => [
                    data.map((c) => ({ target: c.target, allowFailure: true, callData: c.callData }))
                ];
                const chainObjFor = (id) => {
                    if (id === chains_1.CHAIN_IDS.POLYGON_AMOY)
                        return chains_1.POLYGON_AMOY;
                    return chains_1.POLYGON_AMOY;
                };
                const failuresByChain = {};
                for (const cid of candidateChainIds) {
                    if (!chains_1.SUPPORTED_CHAINS.includes(cid))
                        continue;
                    const chainObj = chainObjFor(cid);
                    const rpcUrl = this.getRpcUrlForChain(cid);
                    const tmpPublic = createPublicClient({ chain: chainObj, transport: http(rpcUrl) });
                    try {
                        const sim = await tmpPublic.simulateContract({
                            address: MULTICALL3_ADDRESS,
                            abi: MULTICALL3_ABI,
                            functionName: 'aggregate3',
                            args: preflightArgsFor(multicallData),
                            account: sponsorAccount.address,
                        });
                        const results = sim.result || [];
                        const failed = results
                            .map((r, i) => ({ index: i, success: r.success, target: multicallData[i]?.target }))
                            .filter((r) => !r.success)
                            .map((r) => ({ index: r.index, target: r.target }));
                        failuresByChain[cid] = failed;
                        if (failed.length === 0 && selectedChainId === null) {
                            selectedChainId = cid;
                            selectedChain = chainObj;
                            selectedRpcUrl = rpcUrl;
                            publicClient = tmpPublic;
                        }
                    }
                    catch (e) {
                        failuresByChain[cid] = [{ index: -1, target: 'simulate_failed' }];
                    }
                }
                if (selectedChainId === null) {
                    utils_1.Logger.error('Multicall preflight failed for all candidate chains', { failuresByChain });
                    utils_1.ResponseUtil.error(res, `All candidate chains would fail: ${JSON.stringify(failuresByChain)}`, 400);
                    return;
                }
                // Initialize sponsor wallet on the selected chain (publicClient already created)
                sponsorWallet = createWalletClient({ account: sponsorAccount, chain: selectedChain, transport: http(selectedRpcUrl) });
                utils_1.Logger.info('Executing gas sponsored transaction with multicall', {
                    username,
                    sponsorAddress: sponsorAccount.address,
                    multicallCallsCount: multicallData.length,
                    metadata: metadata.operationType || 'unknown'
                });
                // Multicall3 contract details
                // Preflight: simulate with allowFailure=true to surface inner-call errors cross-chain
                // Note: preflight already performed during auto-selection
                // Execute the multicall transaction
                const txHash = await sponsorWallet.writeContract({
                    address: MULTICALL3_ADDRESS,
                    abi: MULTICALL3_ABI,
                    functionName: 'aggregate3',
                    args: [multicallData],
                });
                utils_1.Logger.info('Gas sponsored transaction submitted', {
                    txHash,
                    username,
                    sponsorAddress: sponsorAccount.address,
                    multicallCallsCount: multicallData.length
                });
                // Wait for transaction receipt
                const receipt = await publicClient.waitForTransactionReceipt({
                    hash: txHash,
                    timeout: 60000, // 60 second timeout
                });
                // Convert BigInt values to strings for logging
                const safeReceipt = this.serializeBigInt({
                    txHash,
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed,
                    status: receipt.status,
                    effectiveGasPrice: receipt.effectiveGasPrice,
                    username,
                    sponsorAddress: sponsorAccount.address
                });
                utils_1.Logger.info('Gas sponsored transaction confirmed', safeReceipt);
                // Calculate gas cost (rough estimate)
                const gasPrice = receipt.effectiveGasPrice || BigInt(1000000000); // 1 gwei fallback
                const gasCost = (receipt.gasUsed * gasPrice).toString();
                // Success response with transaction details
                utils_1.ResponseUtil.success(res, {
                    sponsored: true,
                    transactionHash: txHash,
                    blockNumber: receipt.blockNumber.toString(),
                    gasUsed: receipt.gasUsed.toString(),
                    gasCost: gasCost,
                    sponsorAddress: sponsorAccount.address,
                    message: 'Gas sponsorship executed successfully',
                    executionDetails: {
                        chainId: selectedChain.id,
                        chainName: selectedChain.name,
                        explorerUrl: `https://amoy.polygonscan.com/tx/${txHash}`,
                        multicallCallsExecuted: multicallData.length,
                        status: receipt.status === 'success' ? 'success' : 'failed'
                    }
                }, 'Gas sponsorship request processed and executed successfully');
            }
            catch (error) {
                utils_1.Logger.error('Failed to process gas sponsorship request', {
                    error: error.message,
                    stack: error.stack,
                    username: req.params.username
                });
                // Return proper error response format
                utils_1.ResponseUtil.error(res, error.message, 500);
            }
        };
        // Simple sponsor status endpoint
        this.getSponsorStatus = async (req, res, next) => {
            try {
                utils_1.ResponseUtil.success(res, {
                    status: 'active',
                    sponsor: true
                }, 'Sponsor status retrieved');
            }
            catch (error) {
                utils_1.Logger.error('Failed to get sponsor status', { error });
                next(error);
            }
        };
        // Simple supported operations endpoint
        this.getSupportedOperations = async (req, res, next) => {
            try {
                utils_1.ResponseUtil.success(res, {
                    supportedOperations: [
                        'Safe deployment',
                        'Safe transaction execution',
                        'ERC20 transfers',
                        'Multicall operations'
                    ]
                }, 'Supported operations retrieved');
            }
            catch (error) {
                utils_1.Logger.error('Failed to get supported operations', { error });
                next(error);
            }
        };
        this.userService = new UserService_1.UserService();
        this.supabaseService = new SupabaseService_1.SupabaseService();
        this.stealthAddressService = new StealthAddressService_1.StealthAddressService();
    }
    // Get RPC URL for a specific chain ID
    getRpcUrlForChain(chainId) {
        return chains_1.RPC_URLS[chainId] ?? chains_1.RPC_URLS[chains_1.DEFAULT_CHAIN_ID] ?? chains_1.DEFAULT_RPC_URL;
    }
    // Helper function to convert BigInt values to strings for JSON serialization
    serializeBigInt(obj) {
        return JSON.parse(JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? value.toString() : value));
    }
}
exports.UserController = UserController;
//# sourceMappingURL=UserController.js.map