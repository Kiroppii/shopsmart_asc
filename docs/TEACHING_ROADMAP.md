# ShopSmart Teaching Roadmap

The starter works before every improvement. Each week solves visible limitations.

## Week 1: Functions and cart logic

- Review `frontend/src/utils/cart.js`.
- Extract or improve reusable functions.
- Add decrease-quantity and clear-cart behaviors.
- Extend tests in `cart.test.js`.

## Week 2: React and UX

- Decompose one page into smaller components.
- Explain props, events, state and routes.
- Improve form validation and responsive behavior.
- Replace `CartContext` persistence with a deliberate design.

## Week 3: REST API and database

- Trace React to Express to Prisma to PostgreSQL.
- Add validated product administration endpoints.
- Move filtering to the API.
- Document and test normal and error responses.

## Week 4: Authentication and authorization

- Add User and Role models.
- Hash passwords and create a login/session flow.
- Protect order history by ownership.
- Protect product mutations by administrator role.

## Week 5: AI assistant

- Replace `backend/src/services/assistant.js` rules with an approved AI provider.
- Retrieve only relevant catalog and policy context.
- Keep provider keys on the server.
- Validate structured AI output and retain source references.

## Week 6: Quality and deployment

- Expand unit, integration and end-to-end tests.
- Complete OpenAPI documentation.
- Run a security review.
- Deploy the front end, API and PostgreSQL database.
