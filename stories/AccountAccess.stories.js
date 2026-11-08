import { fn } from 'storybook/test';
import { createAccountAccess } from './AccountAccess';

export default {
  title: 'Account/Access',
  tags: ['autodocs'],
  render: (args) => createAccountAccess(args),
  parameters: { layout: 'fullscreen' },
  args: {
    onSignIn: fn(),
    onSignOut: fn(),
  },
};

export const SignedOut = {};

export const InvalidCredentials = {
  args: { error: 'Email or password is incorrect. Please try again.' },
};

export const SignedIn = {
  args: {
    account: { displayName: 'Jane Doe', role: 'Technician' },
  },
};
