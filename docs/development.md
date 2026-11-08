# Development and verification

## Independent surfaces and prerequisites

The Java incident-management application and Node web application are independent.
Prepare only the surface needed by the selected checks; prepare both if both are exercised.
All commands below run from the execution worktree root, not another checkout.

### Java

- A **JDK 21** is required, not a JRE or JDK 17. Set `JAVA_HOME` to its home
  and put `$JAVA_HOME/bin` on `PATH` before invoking Maven or tests. The Maven
  Enforcer rule rejects other major versions; the compiler targets release 21.
- On macOS with Homebrew's existing `openjdk@21`, for example:
  `export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"`
  then `export PATH="$JAVA_HOME/bin:$PATH"`. This selects an existing JDK; it does
  not install one. On other systems use the installed JDK 21 path.
  On this development Mac the existing JDK home is
  `/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`; macOS's
  default Java selector currently resolves to Java 17, so do not rely on it.
- `./mvnw -v` identifies Maven and its actual Java runtime. Missing JDK 21 is an
  unresolved machine prerequisite, not permission to install system software.
- Use the checked-in Maven Wrapper (`./mvnw` on POSIX, `mvnw.cmd` on Windows).
  It pins Maven 3.9.9 and verifies the distribution SHA-256 in
  `.mvn/wrapper/maven-wrapper.properties`. No global Maven install is required.
  POSIX bootstrap needs a shell, curl or wget, unzip and a supported SHA-256
  utility (for example sha256sum or shasum). Windows uses PowerShell.
  The generated POSIX wrapper has one local portability adjustment: on macOS
  it prefers `shasum -a 256 -c`, because `/sbin/sha256sum` does not implement
  the GNU check-file invocation used by the upstream wrapper. Preserve this
  checksum-enabled adjustment if regenerating the wrapper.
- First use requires HTTPS access to Maven Central for Maven, plugins and JUnit.
  The wrapper caches Maven under `~/.m2/wrapper/dists`; Maven caches artifacts
  under `~/.m2/repository`. Do not copy or symlink another checkout's build outputs.
- `pom.xml` is the complete Java dependency/build authority. Application Java
  uses the standard library; JUnit Jupiter is test-only. Plugin versions are pinned.

## Worktree preparation (setup, not verification)

For Java checks, after selecting JDK 21, run:

```sh
./mvnw -B -ntp org.apache.maven.plugins:maven-dependency-plugin:3.8.1:go-offline
```

This resolves declared Java dependencies and build plugins into the user's Maven
cache. It does not execute application tests, install a JDK, or establish GREEN/RED.
Tests may still resolve provider artifacts on first execution; network access must
remain available then. No separate compilation is required before a test command:
Maven's `test` lifecycle compiles current application and test sources itself.

For web checks requiring Express/SQLite, additionally (or instead for web-only work):

```sh
npm ci
```

`package.json` and `package-lock.json` define the complete Node graph. Node/npm
must satisfy the lockfile's engine requirements (currently Node >=20.17.0 for
sqlite3). Installation needs registry access and possibly GitHub binary downloads.
Allow sqlite3's lifecycle script; native compilation may be needed if no compatible
binary is available. Missing native tooling is an unresolved prerequisite, not
permission to provision system tools. Outputs go to ignored `node_modules/` and
npm's external cache; do not modify the manifest/lockfile to fix setup.

Java-only checks do not need npm, SQLite, Chromium, or a running web server.
Neither application needs external services for the Java build smoke tests.
Do not run `node server.js` as generic preparation: it binds port 3000, opens the
checkout-root database, and serves the repository root. To initialize that same
database without HTTP startup, run `npm run db:init` at the checkout root, or
invoke `node /absolute/path/to/checkout/database/initialize.js` from another cwd.
Initialization creates the existing users table only when absent, preserves
records, and closes its connection. It does not migrate or repair existing schemas.
The server and initializer share `database/connection.js`; each connection enables
foreign keys before schema/data use. The server listens only after setup completes.

Focused SQLite integration coverage uses Node's built-in runner:
`node --test --test-reporter=tap tests/sqlite-initialization.test.cjs`.
It uses temporary project copies and real SQLite; it does not use root data as
fixtures. TAP reports each declared test name and outcome. Root `npm test` remains
a deliberate failure placeholder, not an alias for this focused suite.

## Source ownership and test placement

- Production compilation includes only `IncidentManagement/**/*.java`, via the
  `default-compile` execution in `pom.xml`. Preserve package declarations.
  New production Java outside this inclusion boundary requires an intentional
  build configuration change; it is not automatically compiled.
- Test source root: `tests/java/`. Tests are compiled separately and can use the
  `IncidentManagement` package to access package-private application members.
- Surefire discovers JUnit Jupiter tests with its standard class patterns:
  `Test*`, `*Test`, `*Tests`, `*TestCase` (Java source names). Prefer `*Test.java`.
  Helpers that do not match these patterns are not executable test identities.
- Use ordinary `@Test` methods with stable Java method names for exact inventory
  mapping: `tests/java/<package path>/<Class>Test.java` maps to
  `<package>.<Class>Test#<method>`. Do not depend on display-name wording,
  parameterized invocation names or dynamic tests for this basic command contract.
  Such tests need additional documented selection/reporting mechanics if introduced.

## Focused verification command contract

Working directory: `.` (execution worktree root). Executable: `./mvnw`
(`mvnw.cmd` on Windows). Arguments, in order:

```text
-B -ntp -Dstyle.color=never -Dtest=<selector> test
```

Pass `-Dtest=...` as one argument, without shell quote characters in a structured
argument array. Use class/method identities, not filesystem paths, as selectors:

- One class: `-Dtest=IncidentManagement.JavaBuildTest`
- One exact ordinary method:
  `-Dtest=IncidentManagement.JavaBuildTest#compiledApplicationCreatesDistinctIncidentIdentities`
- Multiple exact methods in one class:
  `-Dtest=IncidentManagement.JavaBuildTest#runsOnJava21InIsolatedBuildDirectory+compiledApplicationCreatesDistinctIncidentIdentities`
- Compatible classes/methods share this Maven project and may be grouped in a
  comma-separated selector: `-Dtest=package.FirstTest#methodA,package.SecondTest#methodB`.
  Avoid wildcard or class-wide selection when exact method selection covers the
  intended inventory more narrowly. Do not add unrelated tests to fill a suite.

For structured command tools that do not preserve shell exports across calls,
select JDK 21 on **each** setup, focused-test and aggregate invocation. On POSIX,
use executable `/usr/bin/env`, cwd `.`, and arguments
`["JAVA_HOME=<installed-JDK-21-home>", "./mvnw", ...Maven arguments above...]`.
For this development Mac the concrete prefix is
`["JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home", "./mvnw"]`.
The wrapper uses `JAVA_HOME/bin/java`, so a persistent PATH edit is not needed.
Do not submit `export`, shell substitution, `&&`, or embedded shell quote characters
as arguments. Use the target machine's established JDK home, not a path from another
machine. Apply this same environment prefix to the documented dependency setup and
final aggregate commands. If the runner already inherits the correct `JAVA_HOME`,
direct `./mvnw` invocation is sufficient.

These are Surefire 3.5.2 selectors; they are not JUnit ConsoleLauncher or Gradle
flags. No separate project or test-file argument is needed. Maven compiles the
project/test sources even when only one test method is selected; unrelated
compilation failure is setup/build failure, not behavioral RED.

`pom.xml` enables plain console reporting (`reportFormat=plain`, `useFile=false`,
`trimStackTrace=false`) and fails for an empty suite or unmatched explicit selector.
For ordinary JUnit tests, require a completed result for each selected class/method;
aggregate totals or a build exit alone are not sufficient proof. Surefire also writes
`target/surefire-reports/TEST-*.xml`: each `testcase` identifies `classname` and
`name`; `failure`/`error` children are unsuccessful results, `skipped` is not execution
proof, and absence of those children represents success only in a completed current
run. Map these structured class/method identities to inventoried file/test names.
Do not match greeting prose or other exact output wording as behavioral proof.
Never treat stale reports as current evidence: correlate them to the actual command
and selected identities, or use a clean run when inspecting report files.
A no-match, skipped test, compile error, launch error or unresolved dependency is
not assertion RED. Do not disable the configured no-tests failures.

## Final aggregate lane

For changes to Java build configuration or the Java application, the full Java
build/test check is:

```sh
./mvnw -B -ntp -Dstyle.color=never clean verify
```

This recompiles all included Java sources, runs the discovered unit tests and
packages the Java artifact. It does not prove web/browser behavior or run the
interactive Java menu. A focused baseline command and this final aggregate lane
have different scopes. No lint, integration-test profile or web test suite is
currently declared; do not invent those obligations or treat startup as verification.

## Mutable state and outputs

`target/` and `node_modules/` are ignored, worktree-local generated directories.
Maven reports, classes and jars belong under `target/`, never beside source files.
Surefire forks tests with `target/` as their working directory, so cwd-relative
application state cannot resolve to checked-in root data. Tests involving persistence
should additionally use a unique temporary directory (for example JUnit `@TempDir`)
and a child process with that directory as its cwd where the application fixes paths.
Do not modify or use the existing root `incidents.dat` or `database.db` as fixtures.
Do not invoke the interactive `Main` in-process: it reads shared stdin, closes its
scanner, and uses shared static state. Tests must restore changed static state and
own/terminate any processes they launch. Current smoke tests do not invoke persistence
or application startup.

Refresh dependency resolution when `pom.xml`, wrapper configuration or relevant
runtime/platform inputs change. Recompile after source changes (the test lifecycle
does this). After Node manifest/lockfile or native-runtime changes, rerun `npm ci`
for web checks. Existing artifacts alone do not establish current-candidate readiness.
Do not commit generated outputs or rely on another worktree's uncommitted setup.
