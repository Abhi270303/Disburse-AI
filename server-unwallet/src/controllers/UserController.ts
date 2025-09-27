import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';
import { SupabaseService } from '../services/SupabaseService';
import { StealthAddressService } from '../services/StealthAddressService';
import { SafeService } from '../services/SafeService';
import { UserRegistrationRequest, UserRegistrationResponse, AuthenticatedRequest, SafeAddressInfo } from '../types';
import { ResponseUtil, Logger } from '../utils';
import { CHAIN_IDS, RPC_URLS, DEFAULT_CHAIN_ID, DEFAULT_RPC_URL, POLYGON_AMOY, SUPPORTED_CHAINS } from '../config/chains';

export class UserController {
  private userService: UserService;
  private supabaseService: SupabaseService;
  private stealthAddressService: StealthAddressService;

  constructor() {
    this.userService = new UserService();
    this.supabaseService = new SupabaseService();
    this.stealthAddressService = new StealthAddressService();
  }

  // Get RPC URL for a specific chain ID
  private getRpcUrlForChain(chainId: number): string {
    return RPC_URLS[chainId] ?? RPC_URLS[DEFAULT_CHAIN_ID] ?? DEFAULT_RPC_URL;
  }

  // Register new user
  registerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const registrationData: UserRegistrationRequest = req.body;

      if (!registrationData.eoaaddress) {
        ResponseUtil.error(res, 'eoaaddress is required for onchain login', 400);
        return;
      }

      Logger.info('User registration request received', { 
        email: registrationData.email,
        username: registrationData.username,
        eoaaddress: registrationData.eoaaddress,
        chainsCount: registrationData.chains?.length || 0
      });

      const result: UserRegistrationResponse = await this.userService.registerUser(registrationData);

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

        const firstChain = user.chains[0]!;
        if (!firstChain.tokenAddresses || firstChain.tokenAddresses.length === 0) {
          throw new Error('No token addresses configured for the first chain');
        }

        const firstTokenAddress = firstChain.tokenAddresses[0]!;

        Logger.info('Generating test stealth address for new user', {
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
        const newNonce = await this.userService.incrementNonce(user.id!);

        const generatedAddress = serviceResponse.addresses[0];
        if (generatedAddress) {
          // Predict Safe address for the test stealth address
          let safeAddressInfo: SafeAddressInfo | undefined = undefined;
          try {
            Logger.info('Predicting Safe address for test stealth address', {
              stealthAddress: generatedAddress.address,
              chainId: firstChain.chainId
            });

            // Create SafeService instance with the correct chain configuration
            const rpcUrl = this.getRpcUrlForChain(firstChain.chainId);
            const safeService = new SafeService(firstChain.chainId, rpcUrl);

            const safeResults = await safeService.predictSafeAddressOnTheBasisOfStealthAddress([generatedAddress.address]);
            
            if (safeResults && safeResults.length > 0) {
              const safeResult = safeResults[0];
              if (safeResult) {
                safeAddressInfo = {
                  address: safeResult.safeAddress,
                  isDeployed: safeResult.isDeployed,
                  ...(safeResult.error && { error: safeResult.error })
                };

                Logger.info('Safe address predicted for test stealth address', {
                  stealthAddress: generatedAddress.address,
                  safeAddress: safeResult.safeAddress,
                  isDeployed: safeResult.isDeployed
                });
              }
            }
          } catch (safeError) {
            Logger.error('Failed to predict Safe address for test stealth address', {
              error: safeError,
              stealthAddress: generatedAddress.address,
              userId: user.id
            });
            // Don't fail registration if Safe prediction fails
          }

          // Store the test stealth address in the database
          try {
            const stealthAddressData = {
              userId: user.id!,
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

            Logger.info('Test stealth address stored in database', {
              recordId: stealthAddressRecord.id,
              userId: user.id,
              stealthAddress: generatedAddress.address,
              safeAddress: safeAddressInfo?.address
            });
          } catch (dbError) {
            Logger.error('Failed to store test stealth address in database', {
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

          Logger.info('Test stealth address generated successfully', {
            userId: user.id,
            username: user.username,
            address: generatedAddress.address,
            chainId: firstChain.chainId,
            newNonce,
            safeAddress: safeAddressInfo?.address
          });
        }
      } catch (stealthError) {
        Logger.error('Failed to generate test stealth address', { 
          error: stealthError, 
          userId: user.id,
          username: user.username
        });
        // Don't fail the registration if stealth address generation fails
        // Just log the error and continue
      }

      // Create conditional instructions based on user type
      const instructions: any = {
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

      ResponseUtil.success(res, {
        ...result,
        token,
        testStealthAddress,
        instructions
      }, 'User registered successfully', 201);

    } catch (error) {
      Logger.error('User registration failed', { error });
      next(error);
    }
  };

  // Login user (supports EOA signature-based login only)
  loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eoaaddress, message, signature } = req.body;

      if (!eoaaddress || !message || !signature) {
        ResponseUtil.error(res, 'eoaaddress, message, and signature are required for login', 400);
        return;
      }

      // Find user by EOA address
      const user = await this.userService.getUserByEOA(eoaaddress);
      if (!user) {
        ResponseUtil.error(res, 'User not found for provided EOA address', 404);
        return;
      }

      // Recover address from signature
      const ethers = require('ethers');
      let recoveredAddress: string;
      try {
        recoveredAddress = ethers.utils.verifyMessage(message, signature).toLowerCase();
      } catch (err) {
        ResponseUtil.error(res, 'Invalid signature', 401);
        return;
      }

      if (recoveredAddress !== user.eoaaddress.toLowerCase()) {
        ResponseUtil.error(res, 'Signature does not match registered EOA address', 401);
        return;
      }

      // Generate new token
      const token = this.userService.generateToken(user);

      Logger.info('User login successful', { 
        userId: user.id,
        email: user.email,
        username: user.username,
        isMerchant: user.isMerchant,
        eoaaddress: user.eoaaddress
      });

      ResponseUtil.success(res, {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isMerchant: user.isMerchant,
          eoaaddress: user.eoaaddress,
          chains: user.chains.map((chain: any) => ({
            chainId: chain.chainId,
            tokenCount: chain.tokenAddresses.length,
            name: chain.name
          }))
        },
        endpoint: `/api/user/${user.username}/stealth`,
        note: 'User login successful - onchain signature verified'
      }, 'Login successful');

    } catch (error) {
      Logger.error('User login failed', { error });
      next(error);
    }
  };

  // Get user profile (requires authentication)
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // This endpoint requires authentication, so user info is available in req.userRecord
      const user = (req as any).userRecord;

      ResponseUtil.success(res, {
        id: user.id,
        username: user.username,
        email: user.email,
        chains: user.chains,
        currentNonce: user.currentNonce,
        isActive: user.isActive,
        createdAt: user.createdAt,
        supportedChainIds: this.userService.getUserChainIds(user),
        totalTokenAddresses: user.chains.reduce((total: number, chain: any) => total + chain.tokenAddresses.length, 0)
      }, 'Profile retrieved successfully');

    } catch (error) {
      Logger.error('Failed to get user profile', { error });
      next(error);
    }
  };

  // Get username by EOA address (public endpoint)
  getUsernameByEOA = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eoaaddress } = req.body;
      if (!eoaaddress) {
        ResponseUtil.error(res, 'eoaaddress is required', 400);
        return;
      }
      const user = await this.userService.getUserByEOA(eoaaddress);
      if (!user) {
        ResponseUtil.error(res, 'User not found for provided EOA address', 404);
        return;
      }
      ResponseUtil.success(res, { username: user.username }, 'Username found for EOA address');
    } catch (error) {
      Logger.error('Failed to get username by EOA address', { error });
      next(error);
    }
  };

  // Helper function to convert BigInt values to strings for JSON serialization
  private serializeBigInt(obj: any): any {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  }

  // Simple gas sponsorship request handler with actual execution
  gasSponsorshipRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username } = req.params;
      const { multicallData, metadata = {}, chainId: requestedChainId } = req.body;

      Logger.info('Gas sponsorship request received', {
        username,
        multicallDataLength: multicallData?.length || 0,
        metadata
      });

      if (!username) {
        ResponseUtil.error(res, 'Username parameter is required', 400);
        return;
      }

      if (!multicallData || !Array.isArray(multicallData) || multicallData.length === 0) {
        ResponseUtil.error(res, 'Valid multicall data is required', 400);
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

      Logger.info('Using sponsor private key', {
        hasPrivateKey: !!SPONSOR_PRIVATE_KEY,
        keyLength: SPONSOR_PRIVATE_KEY.length,
        startsWithOx: SPONSOR_PRIVATE_KEY.startsWith('0x')
      });

      // Create sponsor account
      const sponsorAccount = privateKeyToAccount(formattedPrivateKey as `0x${string}`);

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
      const candidateChainIds: number[] = typeof requestedChainId === 'number' ? [requestedChainId] : (SUPPORTED_CHAINS as number[]);
      let selectedChainId: number | null = null;
      let selectedChain: any = null;
      let selectedRpcUrl: string = '';
      let publicClient: any = null;
      let sponsorWallet: any = null;

      const preflightArgsFor = (data: any[]) => [
        data.map((c: any) => ({ target: c.target, allowFailure: true, callData: c.callData }))
      ];

      const chainObjFor = (id: number) => {
        if (id === CHAIN_IDS.POLYGON_AMOY) return POLYGON_AMOY;
        return POLYGON_AMOY;
      };

      const failuresByChain: Record<number, { index: number; target: string }[]> = {};

      for (const cid of candidateChainIds) {
        if (!SUPPORTED_CHAINS.includes(cid as any)) continue;
        const chainObj = chainObjFor(cid);
        const rpcUrl = this.getRpcUrlForChain(cid);
        const tmpPublic = createPublicClient({ chain: chainObj, transport: http(rpcUrl) });
        try {
          const sim = await tmpPublic.simulateContract({
            address: MULTICALL3_ADDRESS,
            abi: MULTICALL3_ABI,
            functionName: 'aggregate3',
            args: preflightArgsFor(multicallData) as any,
            account: sponsorAccount.address,
          });
          const results = (sim.result as any[]) || [];
          const failed = results
            .map((r: any, i: number) => ({ index: i, success: r.success, target: (multicallData as any[])[i]?.target }))
            .filter((r: any) => !r.success)
            .map((r: any) => ({ index: r.index, target: r.target }));
          failuresByChain[cid] = failed;
          if (failed.length === 0 && selectedChainId === null) {
            selectedChainId = cid;
            selectedChain = chainObj;
            selectedRpcUrl = rpcUrl;
            publicClient = tmpPublic;
          }
        } catch (e) {
          failuresByChain[cid] = [{ index: -1, target: 'simulate_failed' }];
        }
      }

      if (selectedChainId === null) {
        Logger.error('Multicall preflight failed for all candidate chains', { failuresByChain });
        ResponseUtil.error(res, `All candidate chains would fail: ${JSON.stringify(failuresByChain)}`, 400);
        return;
      }

      // Initialize sponsor wallet on the selected chain (publicClient already created)
      sponsorWallet = createWalletClient({ account: sponsorAccount, chain: selectedChain, transport: http(selectedRpcUrl) });

      Logger.info('Executing gas sponsored transaction with multicall', {
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

      Logger.info('Gas sponsored transaction submitted', {
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

      Logger.info('Gas sponsored transaction confirmed', safeReceipt);

      // Calculate gas cost (rough estimate)
      const gasPrice = receipt.effectiveGasPrice || BigInt(1000000000); // 1 gwei fallback
      const gasCost = (receipt.gasUsed * gasPrice).toString();

      // Success response with transaction details
      ResponseUtil.success(res, {
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

    } catch (error) {
      Logger.error('Failed to process gas sponsorship request', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        username: req.params.username
      });
      
      // Return proper error response format
      ResponseUtil.error(res, (error as Error).message, 500);
    }
  };

  // Simple sponsor status endpoint
  getSponsorStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ResponseUtil.success(res, { 
        status: 'active', 
        sponsor: true 
      }, 'Sponsor status retrieved');
    } catch (error) {
      Logger.error('Failed to get sponsor status', { error });
      next(error);
    }
  };

  // Simple supported operations endpoint
  getSupportedOperations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ResponseUtil.success(res, {
        supportedOperations: [
          'Safe deployment',
          'Safe transaction execution',
          'ERC20 transfers',
          'Multicall operations'
        ]
      }, 'Supported operations retrieved');
    } catch (error) {
      Logger.error('Failed to get supported operations', { error });
      next(error);
    }
  };
}