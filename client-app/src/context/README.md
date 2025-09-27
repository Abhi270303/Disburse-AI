# User Data Provider

This directory contains the data provider context that manages user data fetching and provides loading states throughout the application.

## Components

### UserDataProvider

The main context provider that handles username fetching and provides loading states.

**Features:**

- Automatic username fetching when wallet address changes
- Loading states for skeleton components
- Error handling
- Refetch functionality

### useUser Hook

A custom hook that provides easy access to user data with additional utility methods.

**Returns:**

- `username`: The fetched username or null
- `isLoading`: Boolean indicating if data is being fetched
- `error`: Error message if fetch failed
- `refetch`: Function to manually refetch data
- `hasError`: Boolean indicating if there's an error
- `isReady`: Boolean indicating if data is ready (not loading, no error)

## Usage

### Basic Usage

```tsx
import { useUser } from "@/hooks/use-user-data";

const MyComponent = () => {
  const { username, isLoading, error } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>Hello, {username}!</div>;
};
```

### With Skeleton Loading

```tsx
import { useUser } from "@/hooks/use-user-data";
import { UsernameSkeleton } from "@/components/ui/loading-skeletons";

const MyComponent = () => {
  const { username, isLoading } = useUser();

  if (isLoading) return <UsernameSkeleton />;

  return <div>{username}</div>;
};
```

### Error Handling with Retry

```tsx
import { useUser } from "@/hooks/use-user-data";
import { Button } from "@/components/ui/button";

const MyComponent = () => {
  const { username, error, refetch, hasError } = useUser();

  if (hasError) {
    return (
      <div>
        <p>Error: {error}</p>
        <Button onClick={refetch}>Retry</Button>
      </div>
    );
  }

  return <div>{username}</div>;
};
```

## Skeleton Components

The `loading-skeletons.tsx` file contains reusable skeleton components for different UI elements:

- `UsernameSkeleton`: For username loading in navbar
- `CardSkeleton`: For card content loading
- `TableRowSkeleton`: For table row loading
- `WalletAddressSkeleton`: For wallet address loading
- `ButtonSkeleton`: For button loading
- `InputSkeleton`: For input field loading
- `AvatarSkeleton`: For avatar loading

## Setup

The `UserDataProvider` is already set up in the app layout (`src/app/layout.tsx`) and wraps the entire application, so you can use the `useUser` hook anywhere in your components.

## Best Practices

1. **Always handle loading states**: Use skeleton components for better UX
2. **Handle errors gracefully**: Provide retry mechanisms
3. **Use the `isReady` flag**: For actions that should only be available when data is loaded
4. **Cache data**: The provider automatically caches the username for the current session
5. **Use shadcn colors**: All skeleton components use shadcn color tokens for consistency
