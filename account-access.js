'use strict';

window.mountAccountAccess = function mountAccountAccess(root) {
    let revision = 0;

    async function session(method = 'GET', data) {
        const response = await fetch('/api/session', {
            method,
            credentials: 'same-origin',
            cache: 'no-store',
            headers: data ? { 'Content-Type': 'application/json' } : {},
            body: data ? JSON.stringify(data) : undefined
        });
        if (!response.ok) throw new Error('Session request failed');
        return (await response.json()).account;
    }

    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function render(account, error = '') {
        const card = element('section', 'account-access__card');
        card.setAttribute('aria-labelledby', 'account-access-title');
        const title = element('h1', '', account ? 'Your account' : 'Sign in');
        title.id = 'account-access-title';
        card.appendChild(title);

        if (error) {
            const alert = element('p', 'account-access__error', error);
            alert.setAttribute('role', 'alert');
            card.appendChild(alert);
        }
        if (account) {
            card.appendChild(element('p', 'account-access__name', account.display_name));
            card.appendChild(element('p', 'account-access__role', account.role));
            const signOut = element('button', '', 'Sign out');
            signOut.type = 'button';
            signOut.addEventListener('click', async () => {
                const current = ++revision;
                signOut.disabled = true;
                try {
                    await session('DELETE');
                    if (current === revision) render(null);
                } catch {
                    if (current === revision) render(account, 'Sign-out could not be completed. Try again.');
                }
            });
            card.appendChild(signOut);
        } else {
            card.appendChild(element('p', 'account-access__intro', 'Use your existing account to sign in.'));
            const form = element('form');
            const inputs = {};
            for (const [name, labelText] of [['email', 'Email address'], ['password', 'Password']]) {
                const label = element('label', '', labelText);
                const input = element('input');
                input.id = 'account-access-' + name;
                input.name = name;
                input.type = name;
                input.autocomplete = name === 'password' ? 'current-password' : 'email';
                input.required = true;
                label.htmlFor = input.id;
                inputs[name] = input;
                form.append(label, input);
            }
            const signIn = element('button', '', 'Sign in');
            signIn.type = 'submit';
            form.appendChild(signIn);
            form.addEventListener('submit', async event => {
                event.preventDefault();
                const current = ++revision;
                signIn.disabled = true;
                const credentials = { email: inputs.email.value, password: inputs.password.value };
                inputs.password.value = '';
                try {
                    const identity = await session('POST', credentials);
                    if (current === revision) render(identity);
                } catch {
                    if (current === revision) render(null, 'Sign-in was unsuccessful. Check your credentials and try again.');
                }
            });
            card.appendChild(form);
        }
        // All identity and error values are text nodes, never HTML.
        root.replaceChildren(card);
    }

    async function restoreSession() {
        const current = ++revision;
        // Do not display a cached identity while server validation is pending.
        render(null);
        try {
            const account = await session();
            if (current === revision) render(account);
        } catch {
            if (current === revision) render(null, 'Account access is unavailable. Please try again.');
        }
    }

    window.addEventListener('pageshow', event => {
        if (event.persisted) restoreSession();
    });
    restoreSession();
};
