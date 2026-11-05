# ShopSmart Starter Application

ShopSmart is a working educational e-commerce starter for a six-week BSIT full-stack AI application development sequence. It contains a React front end, Express REST API, PostgreSQL database through Prisma, shopping cart, simulated checkout and rule-based product assistant.

The application intentionally leaves several improvements for later lessons. It is for classroom use and must not process real payments or personal customer data.

## Software to install

Install these before setting up ShopSmart:

1. Visual Studio Code: https://code.visualstudio.com/
2. Node.js LTS 22 or newer: https://nodejs.org/
3. Git: https://git-scm.com/downloads
4. PostgreSQL 16 or newer: https://www.postgresql.org/download/
5. Bruno for API testing: https://www.usebruno.com/downloads
6. Google Chrome or Microsoft Edge

During PostgreSQL installation, keep the default port `5432` and record the password assigned to the `postgres` administrator account.

## Windows installation: every step

### A. Install Visual Studio Code

1. Open https://code.visualstudio.com/.
2. Select **Download for Windows**.
3. Run the downloaded installer.
4. Accept the license agreement.
5. Keep the default installation location.
6. Select **Add to PATH**.
7. Select **Add “Open with Code” action** if it is available.
8. Complete the installation and open Visual Studio Code once.

### B. Install Node.js

1. Open https://nodejs.org/.
2. Download the current **LTS** installer. Do not select the Current release.
3. Run the installer.
4. Accept the license agreement.
5. Keep the default components, including npm.
6. Complete the installation.
7. Close and reopen PowerShell.
8. Run:

```powershell
node --version
npm --version
```

Both commands must display version numbers. ShopSmart requires Node.js 20.19 or newer and recommends Node.js 22 LTS.

### C. Install Git

1. Open https://git-scm.com/downloads.
2. Download Git for Windows.
3. Run the installer.
4. Keep the default components.
5. Select Visual Studio Code as Git's default editor if prompted.
6. Keep the recommended command-line and HTTPS options.
7. Complete the installation.
8. Close and reopen PowerShell.
9. Run:

```powershell
git --version
```

### D. Install PostgreSQL

1. Open https://www.postgresql.org/download/windows/.
2. Download the Windows installer.
3. Run the installer as an administrator.
4. Keep **PostgreSQL Server**, **pgAdmin 4**, and **Command Line Tools** selected.
5. Choose an installation directory.
6. Enter and record a password for the `postgres` administrator account.
7. Keep port `5432` unless the instructor specifies another port.
8. Keep the default locale.
9. Complete the installation.
10. Open **SQL Shell (psql)** from the Windows Start menu.
11. Press Enter to accept `localhost`, database `postgres`, port `5432`, and username `postgres`.
12. Enter the PostgreSQL administrator password. The password will not appear while typing.
13. At the `postgres=#` prompt, run these statements one at a time:

```sql
CREATE USER shopsmart_user WITH PASSWORD 'shopsmart_dev';
CREATE DATABASE shopsmart OWNER shopsmart_user;
```

14. Confirm that each statement returns `CREATE ROLE` or `CREATE DATABASE`.
15. Type `\q` and press Enter to close SQL Shell.

If PostgreSQL reports that the user or database already exists, do not create another one. Ask the instructor before deleting existing data.

### E. Install Bruno

1. Open https://www.usebruno.com/downloads.
2. Download the Windows installer.
3. Run it and complete the default installation.
4. Open Bruno once to verify it starts.

## Set up the ShopSmart project

### 1. Extract the project

1. Download `ShopSmart-Starter.zip`.
2. Right-click the ZIP file and select **Extract All**.
3. Choose a location that you can write to, such as `Documents\BSIT`.
4. Open the extracted `ShopSmart-Starter` folder.
5. Confirm that `package.json`, `frontend`, `backend`, `docs`, and this `README.md` are visible.

Do not run the project while it remains inside the ZIP archive.

### 2. Open the correct folder in Visual Studio Code

1. Open Visual Studio Code.
2. Select **File > Open Folder**.
3. Select the extracted `ShopSmart-Starter` folder, not only `frontend` or `backend`.
4. If Visual Studio Code asks whether you trust the authors, select **Yes, I trust the authors** only for the instructor-provided copy.
5. Select **Terminal > New Terminal**.
6. Confirm that the terminal path ends in `ShopSmart-Starter`.

### 3. Create the environment files

Run these commands in PowerShell from the project root:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Open `backend/.env`. It should contain:

```env
DATABASE_URL="postgresql://shopsmart_user:shopsmart_dev@localhost:5432/shopsmart?schema=public"
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

If the class uses a different database password or port, update only the matching part of `DATABASE_URL`.

Never upload `.env` files or paste their contents into a public repository or AI service.

### 4. Install all project dependencies

From the project root, run:

```powershell
npm install
```

Wait until the command finishes. Do not close the terminal. A `node_modules` folder and `package-lock.json` should appear.

If PowerShell blocks `npm.ps1`, open PowerShell as the current user and run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Confirm the change, close PowerShell, reopen Visual Studio Code and run `npm install` again.

### 5. Generate the Prisma database client

Run:

```powershell
npm run db:generate
```

The command must finish without an error.

### 6. Create the database tables

Make sure the PostgreSQL service is running. Then run:

```powershell
npm run db:migrate
```

Prisma will connect using `backend/.env` and create the Product, Order and OrderItem tables. The migration command should report that the database is in sync.

### 7. Insert sample products

Run:

```powershell
npm run db:seed
```

The terminal should display:

```text
Seeded 6 ShopSmart products.
```

Running this command again deletes existing classroom orders and restores the six sample products. Do not reseed a database containing work you need to keep.

### 8. Run the automated checks

Run:

```powershell
npm run check
```

This command runs front-end linting, back-end linting, automated tests and the production front-end build. Correct any reported error before continuing.

### 9. Start ShopSmart

Run:

```powershell
npm run dev
```

Keep this terminal open. It runs both applications:

- Front end: http://localhost:5173
- API: http://localhost:3000

### 10. Verify the API

1. Open a browser.
2. Visit http://localhost:3000/api/health.
3. Confirm that the browser displays:

```json
{"status":"ok"}
```

4. Visit http://localhost:3000/api/products.
5. Confirm that the response contains six products.

### 11. Verify the front end

1. Visit http://localhost:5173.
2. Confirm that six product cards appear.
3. Search for `keyboard`.
4. Clear the search.
5. Add a product to the cart.
6. Open the cart and change the quantity.
7. Select **Proceed to checkout**.
8. Enter a name, valid email address and address of at least ten characters.
9. Select **Place simulated order**.
10. Confirm that an order number appears.
11. Open **AI Assistant**.
12. Ask `Which keyboard is below ₱2,000?`.
13. Confirm that the response recommends a matching product.

### 12. Stop the application

1. Return to the terminal running `npm run dev`.
2. Press `Ctrl+C`.
3. If PowerShell asks to terminate the batch job, type `Y` and press Enter.

## macOS or Linux differences

After installing Node.js, Git and PostgreSQL, create the database using a PostgreSQL administrator account:

```bash
psql -U postgres
```

Then run:

```sql
CREATE USER shopsmart_user WITH PASSWORD 'shopsmart_dev';
CREATE DATABASE shopsmart OWNER shopsmart_user;
\q
```

Create environment files with:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

All remaining npm commands are the same as the Windows instructions.

## Daily startup after the first installation

1. Start PostgreSQL.
2. Open the `ShopSmart-Starter` folder in Visual Studio Code.
3. Open a terminal in the project root.
4. Run `npm run dev`.
5. Open http://localhost:5173.
6. Press `Ctrl+C` when finished.

You do not need to repeat `npm install`, migration or seeding every day.

## Common problems

### `npm` is not recognized

Node.js is missing or the terminal was open during installation. Install Node.js LTS, then completely close and reopen Visual Studio Code.

### Prisma cannot connect to PostgreSQL

Check that PostgreSQL is running and that `DATABASE_URL` uses the correct username, password, port and database name.

### Port 3000 or 5173 is already in use

Stop the previous ShopSmart process with `Ctrl+C`. Do not change ports unless the instructor directs the whole class to update the configuration.

### Products do not appear

Verify http://localhost:3000/api/health, then run `npm run db:seed` and restart `npm run dev`.

### The browser reports a CORS error

Confirm that the front end uses http://localhost:5173 and that `FRONTEND_URL=http://localhost:5173` appears in `backend/.env`.

## Project commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install all dependencies |
| `npm run dev` | Run front end and API |
| `npm run check` | Lint, test and build |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Create or update database tables |
| `npm run db:seed` | Reset and insert sample data |
| `npm run db:studio` | Open the Prisma database viewer |

Read `docs/TEACHING_ROADMAP.md` for the weekly improvement plan.
