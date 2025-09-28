import Image from "next/image";

interface GetStartedProps {
  onSignIn: () => void;
  onCreateWallet: () => void;
}

const GetStarted: React.FC<GetStartedProps> = ({
  onSignIn,
  onCreateWallet,
}) => {
  return (
    <div className="flex min-h-screen h-full items-center justify-center p-4">
      {/* Centered Content */}
      <div className="w-full max-w-xl mx-auto border rounded-none p-3 bg-muted/10 p-12">
        <div className="flex flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-16 justify-center">
            <Image
              src="/logo/logo-dark.svg"
              alt="Unwallet"
              width={40}
              height={40}
            />
            <span className="text-card-foreground font-semibold text-2xl font-mono">
              Disburse AI
            </span>
          </div>

          {/* Options Content */}
          <div className="flex flex-col justify-center">
            <div className="space-y-6">
              <div>
                <p className="text-muted-foreground text-sm text-center">
                  Choose how you&apos;d like to get started
                </p>
              </div>

              <div className="space-y-4">
                {/* Create New Wallet Option */}
                <button
                  className="w-full p-6 bg-card border border-border rounded-none text-left hover:border-primary hover:bg-accent/50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] group"
                  onClick={onCreateWallet}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors font-mono">
                        Create New Wallet
                      </h3>
                      <div className="w-8 h-8 bg-primary rounded-none flex items-center justify-center group-hover:bg-primary/80 transition-colors">
                        <svg
                          className="w-4 h-4 text-primary-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Set up a new personal or merchant wallet with stealth
                      address capabilities
                    </p>
                  </div>
                </button>

                {/* Sign In Option */}
                <button
                  className="w-full p-6 bg-card border border-border rounded-none text-left hover:border-primary hover:bg-accent/50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] group"
                  onClick={onSignIn}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors font-mono">
                        Sign In
                      </h3>
                      <div className="w-8 h-8 bg-secondary rounded-none flex items-center justify-center group-hover:bg-secondary/80 transition-colors">
                        <svg
                          className="w-4 h-4 text-secondary-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Access your existing wallet and manage your stealth
                      addresses
                    </p>
                  </div>
                </button>
              </div>

              <p className="text-muted-foreground text-xs text-center">
                By using Disburse AI, you agree to the{" "}
                <a
                  href="#"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  Privacy Policy
                </a>
                , including{" "}
                <a
                  href="#"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  Cookie Use
                </a>
                .
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8">
            <p className="text-muted-foreground text-xs text-center">
              © Copyright Unwallet 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
