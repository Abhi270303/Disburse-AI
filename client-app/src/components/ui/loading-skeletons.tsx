import { Skeleton } from "./skeleton";
import { User, Wallet } from "lucide-react";

// Username skeleton for navbar
export const UsernameSkeleton = () => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
      <User className="h-4 w-4 text-muted-foreground" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
};

// Card skeleton for dashboard/revenue pages
export const CardSkeleton = () => {
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-8 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
};

// Table row skeleton
export const TableRowSkeleton = () => {
  return (
    <div className="flex items-center space-x-4 p-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
};

// Wallet address skeleton
export const WalletAddressSkeleton = () => {
  return (
    <div className="flex items-center gap-2">
      <Wallet className="h-4 w-4 text-muted-foreground" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
};

// Button skeleton
export const ButtonSkeleton = () => {
  return <Skeleton className="h-10 w-24 rounded-md" />;
};

// Input skeleton
export const InputSkeleton = () => {
  return <Skeleton className="h-10 w-full rounded-md" />;
};

// Avatar skeleton
export const AvatarSkeleton = () => {
  return <Skeleton className="h-10 w-10 rounded-full" />;
};

// Withdrawal card skeleton
export const WithdrawalCardSkeleton = () => {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
};

// Withdrawal table skeleton
export const WithdrawalTableSkeleton = () => {
  return (
    <div className="space-y-4">
      {/* Action bar skeleton */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-accent/10 border border-border/50 rounded-none">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-background border border-border/50 rounded-none overflow-hidden">
        <div className="p-4 space-y-4">
          {/* Table header skeleton */}
          <div className="grid grid-cols-7 gap-4 pb-4 border-b border-border/50">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* Table rows skeleton */}
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-7 gap-4 py-4 border-b border-border/50 last:border-b-0"
            >
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Withdrawal list skeleton (keeping for backward compatibility)
export const WithdrawalListSkeleton = () => {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <WithdrawalCardSkeleton key={index} />
      ))}
    </div>
  );
};
