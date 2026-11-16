# Test the deployed US-004 yourself

Live site: https://walletgate.beeswarm.dev/
CLI guidance: https://walletgate.beeswarm.dev/#applications
Your CLI authorizations: https://walletgate.beeswarm.dev/#authorizations

Deployed revision: de112c63889b8d8d9e26f89e2aea63feacf65743. This is a new database. Previous users/clients were not migrated or deleted; the old database/release are retained for rollback. Existing RP integrations need new registration and updated credentials before they can sign in against this environment.

## 1. Prepare the CLI on Linux

Run the CLI on the **same Linux computer as the browser** for the simplest test. Node22.22 or newer is required.

Download the local artifact `work/US-004/artifacts/walletgate-us004-cli.tar.gz`, then:

```sh
tar -xzf walletgate-us004-cli.tar.gz
cd walletgate-us004-cli
npm ci
npm run cli -- help
```

The bundle contains the exact deployed CLI, root package/lock and companion skill, with no credentials, environment files, database or dependencies. It is CLI-only: do not run its server/build/test package scripts. Bundle SHA256: dfdfdb08b7b79252feb3cb62490492309af3b453ea0090b856e079fbd74fa5e0.

If using a full checkout on that same computer, use the verified US-004 checkout and its installed dependencies instead. If running in the shared cloud workspace, the exact deployed CLI is already installed at `/home/ubuntu/walletgate-releases/de112c63889b8d8d9e26f89e2aea63feacf65743`; use the SSH forwarding procedure in section8 when your browser is on another computer.

## 2. Sign in and approve registration

```sh
npm run cli -- login --origin https://walletgate.beeswarm.dev --label 'My manual test' --profile manual --no-open
```

Keep the CLI running. Open the printed `authorization_url` in that computer's browser. Sign in with your wallet through the normal SIWE flow, review the wallet and installation label, check **Create new applications using single-use IATs**, then choose **Allow selected access**. Nothing is preselected. Return to the terminal; login should finish and print your wallet, authorization ID and granted permissions, without tokens.

Expected: initial login can complete with no registered applications. The browser does not need a CLI client secret, wallet private key or exported cookies.

## 3. Register a disposable application

Generate one nonsecret UUID and retain it for retries:

```sh
TEST_SUBMISSION_ID="$(node -e 'console.log(crypto.randomUUID())')"
npm run cli -- create --name 'Manual test app' --redirect https://rp.example/callback --request-id "$TEST_SUBMISSION_ID" --profile manual
```

`https://rp.example/callback` is dummy registration metadata for testing CRUD, not a working RP login service. The create command obtains its IAT internally. Output should contain `application.clientId`, `replayed:false` and `secret_file`; the one-time secret itself is saved to that private local file and is not printed. Do not paste that file into chat or logs.

Copy only the public client ID into this variable:

```sh
TEST_CLIENT_ID='PASTE_application.clientId_HERE'
npm run cli -- list --profile manual
```

Expected: **the list is empty at this point**. Registration permission does not automatically grant read/update/delete authority over the new client. This is intentional.

If the creation response was lost, retry the same original command with the same UUID and original authorization. It must not create another client or redisclose the secret. Do not generate a new UUID just because a response was lost. Reauthorization replaces the original parent grant, so perform any reconciliation before replacing it.

## 4. Explicitly authorize management of this client

Run login again with the same profile:

```sh
npm run cli -- login --origin https://walletgate.beeswarm.dev --label 'My manual test' --profile manual --no-open
```

In the browser, select **Read configuration**, **Update name and redirects** and **Permanently delete** for your disposable application. You may leave registration unchecked if you do not need another client. Choose **Allow selected access**. Successful completion replaces only this profile's prior authorization.

```sh
npm run cli -- list --profile manual
npm run cli -- get "$TEST_CLIENT_ID" --profile manual
```

Expected: the list/detail now contains the selected app, its ID/name/redirects and no client secret. Other clients without selected read permission are absent.

## 5. Update and verify

```sh
npm run cli -- update "$TEST_CLIENT_ID" --name 'Manual test app updated' --redirect https://rp.example/updated-callback --profile manual
npm run cli -- get "$TEST_CLIENT_ID" --profile manual
```

Expected: the new name and complete redirect set persist. An invalid update such as an HTTP non-loopback redirect must fail and leave the previous valid values intact.

Optional: sign out of WalletGate in the browser, then run CLI `list` again. It should still work: browser session logout does not revoke the independently authorized CLI grant. Expired access tokens refresh automatically while the delegated grant is active.

## 6. Delete only the disposable client

```sh
npm run cli -- delete "$TEST_CLIENT_ID" --yes --profile manual
npm run cli -- list --profile manual
```

Expected: the deletion succeeds and the app is absent; its quota slot is freed. Repeating the deletion returns a nonzero not-found-or-not-authorized result. Omit `--yes` in an interactive terminal if you prefer to type the selected ID as confirmation. Do not use these instructions to delete a real integration inadvertently.

## 7. Revoke this CLI authorization and clean up

Open https://walletgate.beeswarm.dev/#authorizations and sign in if necessary. Locate **My manual test**, confirm its authorization ID and permissions, then use **Revoke** and **Confirm revoke**.

```sh
npm run cli -- list --profile manual
```

Expected: the command fails and requests new authorization. Another independently authorized profile should remain usable. Revocation also invalidates outstanding IATs under this authorization; it does not delete already-created clients.

```sh
npm run cli -- logout --profile manual
```

Expected: server revocation is confirmed and the local profile credential is removed. If the server is unreachable, logout instead reports revocation incomplete and retains credentials for retry; use browser revocation when available. The separate one-time client-secret file is yours to remove after the disposable app is deleted.

## 8. Remote Linux/SSH alternative

If the CLI runs on a remote Linux host but your browser is local:

```sh
npm run cli -- login --origin https://walletgate.beeswarm.dev --label 'Remote manual test' --profile manual --no-open --ssh-host YOUR_SSH_HOST
```

The event includes `ssh_forward`, an argument array containing the chosen port. On your browser's local computer, run the equivalent `ssh -N -L PORT:127.0.0.1:PORT YOUR_SSH_HOST` using that exact emitted port, then open the emitted authorization URL locally. Keep the remote CLI and tunnel running. Existing authorized SSH access is required. No Device Authorization or hosted callback relay is included. This external SSH procedure is documented; the deployed release smoke tested the local callback/provider flow, not a real remote SSH host.

## Optional permission and wallet-isolation checks

- Authorize a second profile with read permission only. Update/delete must fail; the first profile's permissions do not carry over.
- Authorize read on app A and update on app B. You must not gain update on A or read on B.
- Sign in with a second wallet. The first wallet's clients must not appear in its consent selection, and guessed client IDs must not grant access.
- Refresh reuse has no grace. If the CLI loses a rotated refresh response, authorize again rather than manually copying/retrying old credentials.

The deployed build passed actual-release SIWE, native public PKCE/opaque management tokens, IAT reference ownership, update/deletion, management refresh/revocation, RP code/independent RSA verification, UserInfo and RP refresh/revocation checks on a disposable database. Public TLS/assets/API boundaries and browser rendering passed without creating users or applications in the new live database.
