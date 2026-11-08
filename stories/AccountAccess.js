import './account-access.css';

// A visual-only account access preview. Callbacks are Storybook actions, not authentication.
export const createAccountAccess = ({
  account = null,
  error = '',
  onSignIn = () => {},
  onSignOut = () => {},
} = {}) => {
  const page = document.createElement('main');
  page.className = 'account-access';

  const card = document.createElement('section');
  card.className = 'account-access__card';
  card.setAttribute('aria-labelledby', 'account-access-title');
  page.appendChild(card);

  const title = document.createElement('h1');
  title.id = 'account-access-title';
  title.textContent = account ? 'Your account' : 'Sign in';
  card.appendChild(title);

  if (account) {
    const name = document.createElement('p');
    name.className = 'account-access__name';
    name.textContent = account.displayName;
    card.appendChild(name);

    const role = document.createElement('p');
    role.className = 'account-access__role';
    role.textContent = account.role;
    card.appendChild(role);

    const signOut = document.createElement('button');
    signOut.type = 'button';
    signOut.textContent = 'Sign out';
    signOut.addEventListener('click', onSignOut);
    card.appendChild(signOut);
    return page;
  }

  const intro = document.createElement('p');
  intro.className = 'account-access__intro';
  intro.textContent = 'Use your existing account to sign in.';
  card.appendChild(intro);

  if (error) {
    const message = document.createElement('p');
    message.className = 'account-access__error';
    message.setAttribute('role', 'alert');
    message.textContent = error;
    card.appendChild(message);
  }

  const form = document.createElement('form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    // No passwords are read, stored, or sent in this visual preview.
    onSignIn();
  });

  const emailLabel = document.createElement('label');
  emailLabel.htmlFor = 'account-access-email';
  emailLabel.textContent = 'Email address';
  form.appendChild(emailLabel);

  const email = document.createElement('input');
  email.id = 'account-access-email';
  email.type = 'email';
  email.name = 'email';
  email.autocomplete = 'email';
  email.required = true;
  form.appendChild(email);

  const passwordLabel = document.createElement('label');
  passwordLabel.htmlFor = 'account-access-password';
  passwordLabel.textContent = 'Password';
  form.appendChild(passwordLabel);

  const password = document.createElement('input');
  password.id = 'account-access-password';
  password.type = 'password';
  password.name = 'password';
  password.autocomplete = 'current-password';
  password.required = true;
  form.appendChild(password);

  const signIn = document.createElement('button');
  signIn.type = 'submit';
  signIn.textContent = 'Sign in';
  form.appendChild(signIn);
  card.appendChild(form);

  return page;
};
