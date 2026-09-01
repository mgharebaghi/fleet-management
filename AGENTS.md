# AGENTS.md — FleetManagement

## Purpose

This file defines stable, repository-level engineering rules for coding agents working on FleetManagement.

It is not a project journal and must not be used to store:

* current progress
* temporary decisions
* session notes
* phase-specific status
* current backlog
* implementation history

Agents must:

* work only within the current task scope
* preserve the database contract
* preserve architecture boundaries
* follow repository conventions
* use evidence before claiming completion
* avoid unintended database changes
* avoid scope creep
* avoid unnecessary abstractions
* produce readable, explicit, maintainable code

If the current task conflicts with these rules, report the conflict before implementation.

---

# 1. Non-Negotiable Rules

The following rules have the highest priority.

## 1.1 Database Safety

SQL Server is the source of truth for the data model.

Never change the existing database structure without explicit approval.

Do not run or create:

* `prisma migrate dev`
* Prisma migrations
* `prisma db push`
* schema-changing SQL
* destructive SQL
* Table changes
* Column changes
* Constraint changes
* Index changes
* Relation changes

unless explicitly approved.

---

## 1.2 Scope Safety

Only modify what is required by the current task.

Do not expand into another:

* feature
* domain
* table
* route
* component
* refactor
* API
* UI flow

without a direct requirement.

---

## 1.3 Architecture Boundary

Application code must not depend on:

* Prisma
* Prisma Client types
* SQL Server
* Infrastructure implementations
* Next.js Server APIs
* Server Actions
* Route Handler implementations
* persistence details

Prisma belongs to Infrastructure.

---

## 1.4 Repository Convention

Existing acceptable FleetManagement conventions take precedence over agent preference.

Do not invent a new naming, folder, architecture, or testing pattern when an established repository pattern already solves the same problem.

For the first implementation of a new pattern, prefer the smallest clear structure that can become the reference pattern for future slices.

---

## 1.5 Code Language

All technical code must be written in English.

Persian is allowed only for text directly shown to the user in the Persian UI.

---

## 1.6 Evidence Before Done

A successful build or an agent claim is not sufficient evidence.

Before claiming completion, review the relevant:

* Diff
* Git state
* Scope
* Architecture
* Database safety
* Tests
* behavior
* documentation impact

---

# 2. Project Context

FleetManagement is a fleet-management application with a Persian RTL user interface.

Main stack:

* Next.js
* React
* TypeScript
* SQL Server
* Prisma ORM using Database-first

Preferred architecture:

* Feature-based Architecture
* Layered Architecture
* Vertical Slice Development

The architecture should keep Business and Application logic independent from framework and persistence details where practical.

This allows future clients such as Desktop, Mobile, or external API consumers to reuse the same business contracts without requiring unnecessary abstraction today.

---

# 3. Source of Truth

Different information has different authoritative sources.

## Database Structure

Source of truth:

SQL Server

Includes:

* Table names
* Column names
* SQL types
* Primary Keys
* Foreign Keys
* Identity
* Nullable
* Defaults
* Unique Constraints
* CHECK Constraints
* Indexes
* Relations
* Cardinality

Never infer these from assumptions.

Correct Prisma flow:

```text
SQL Server
→ prisma db pull
→ schema.prisma
→ Prisma Client
```

Prisma consumes the database model.

Prisma does not define the existing production data model.

---

## Business Rules

Business rules come from confirmed product/business requirements.

A Business Rule may need to be implemented in Application even when the equivalent Database Constraint does not yet exist.

Examples:

* uniqueness requirement
* validation requirement
* allowed state transition
* business eligibility rule

Do not invent a Business Rule because it "sounds reasonable".

If a required Business Rule is unclear, report the uncertainty.

---

# 4. Scope Rules

Work only inside the scope of the current task.

The existence of a:

* Prisma model
* SQL table
* folder
* route
* feature
* domain concept

does not authorize development of that area.

Without a direct requirement:

* do not enter another domain
* do not implement future features
* do not create speculative APIs
* do not create speculative UI
* do not perform broad cleanup
* do not refactor unrelated code
* do not prepare architecture for hypothetical requirements

If correct implementation appears to require scope expansion:

1. identify the problem
2. explain why the expansion appears necessary
3. identify affected areas
4. evaluate a simpler in-scope alternative
5. request approval before proceeding

---

# 5. Repository and File Naming Conventions

Naming must describe stable concepts and responsibilities.

## 5.1 Existing Pattern Wins

Before creating a new:

* file
* folder
* component
* use case
* test
* port
* repository
* adapter

inspect the nearest comparable implementation in the repository.

If an existing pattern is clear and acceptable, follow it.

Do not introduce a parallel convention for personal preference.

---

## 5.2 Concept-First Naming

Prefer:

```text
Concept + Responsibility
```

over:

```text
Current file contents
```

A filename should remain meaningful even when the implementation grows.

Example:

Preferred:

```text
create-person.contract.ts
```

instead of:

```text
input.ts
```

when the file owns the Create Person application contract.

The reason is that `create-person.contract.ts` communicates the architectural concept and ownership.

`input.ts` only describes one current implementation detail.

---

## 5.3 Do Not Split Files Without a Reason

Concept-first naming does not mean every concept requires its own file.

For a small use case, this can be completely valid:

```text
create-person.ts
```

containing:

* CreatePersonInput
* CreatePersonResult
* CreatePerson use case

Separate files only when separation improves:

* ownership
* readability
* reuse
* boundary clarity
* testability
* maintainability

Do not create files only to make the folder structure appear more architectural.

---

## 5.4 Preferred Naming Examples

Typical FleetManagement naming should prefer patterns such as:

```text
create-person.ts
create-person.test.ts
create-person.contract.ts
person-repository.ts
prisma-person-repository.ts
prisma-person-repository.integration.test.ts
create-person.action.ts
create-person-form.tsx
create-person-form.test.tsx
```

These are examples, not mandatory files.

Only create files that the current slice actually needs.

---

## 5.5 Avoid Generic File Names

Avoid generic names when they hide ownership or intent:

```text
input.ts
output.ts
types.ts
interfaces.ts
data.ts
common.ts
shared.ts
helper.ts
helpers.ts
utils.ts
manager.ts
service.ts
handler.ts
```

They are allowed only when the surrounding context makes responsibility genuinely unambiguous.

Prefer names that reveal the capability or concept.

For example:

```text
national-code-validator.ts
```

is better than:

```text
validator.ts
```

if a separate validator file is actually needed.

---

## 5.6 File Ownership

Keep types close to the code that owns them.

Do not immediately move types into:

```text
shared/
types/
common/
```

just because multiple types exist.

Only extract shared contracts after real reuse or ownership becomes clear.

---

## 5.7 Port Naming

Ports describe what Application needs.

They must not describe Infrastructure technology.

Preferred:

```text
person-repository.ts
```

Not:

```text
prisma-person-repository-port.ts
sql-person-repository.ts
database-service.ts
```

Technology belongs in Infrastructure implementations.

---

## 5.8 Infrastructure Naming

Infrastructure implementation names should reveal their implementation technology when useful.

Example:

```text
prisma-person-repository.ts
```

This clearly distinguishes the Application abstraction:

```text
PersonRepository
```

from its Prisma implementation.

---

## 5.9 Test Naming

Test files should clearly identify what they test.

Examples:

```text
create-person.test.ts
prisma-person-repository.integration.test.ts
create-person-form.test.tsx
create-person.e2e.ts
```

Do not use vague names such as:

```text
test.ts
tests.ts
spec.ts
```

when a more specific name is practical.

---

# 6. Semantic Naming

All names must be meaningful and intent-revealing.

Names should communicate:

* what the data represents
* what responsibility the object has
* what an operation does
* what a state/result means

Prefer:

```text
personRepository
createPersonInput
existingNationalCode
findPersonById
vehicleAssignment
```

instead of:

```text
repo
data
value
getData
item
```

Avoid vague naming such as:

* `data`
* `item`
* `obj`
* `temp`
* `value`
* `result`
* `info`
* `manager`
* `helper`
* `util`
* `handler`

unless the local context makes the meaning completely obvious.

Use:

```text
Clear intent > abbreviation > clever naming
```

Avoid unnecessary abbreviations.

Well-known domain or technology abbreviations such as these are acceptable when clear:

* id
* api
* url
* vin
* db

Do not rename acceptable existing code only for stylistic preference.

Renaming should improve real:

* clarity
* consistency
* correctness
* architecture

and remain inside task scope.

---

# 7. Code Language and Comments

## 7.1 English Technical Code

The following must be English:

* Variables
* Functions
* Methods
* Classes
* Interfaces
* Types
* Enums
* File names
* Folder names
* Component names
* Hook names
* Use Case names
* Repository names
* Port names
* Test names
* Test descriptions
* Comments
* JSDoc
* Error identifiers
* Internal error messages
* Log messages
* Technical constants
* Commit messages

---

## 7.2 Persian User-Facing Strings

Persian is allowed when the string is directly presented to the user.

Examples:

* Page title
* Form label
* Button label
* Validation message
* User-facing error
* Empty state
* Confirmation message
* Table heading
* Navigation label

Persian UI does not mean Persian code.

---

## 7.3 Comments

Prefer self-explanatory code.

Use comments only when they provide useful context that the code cannot clearly express.

Good comments normally explain:

* why a decision was made
* a non-obvious constraint
* an invariant
* a business rule that is not obvious
* behavior imposed by SQL Server or an external system
* why an apparently simpler approach is incorrect
* a deliberate workaround

Do not comment obvious code.

Bad:

```ts
// Check if the person exists
const person = await personRepository.findById(personId);
```

Before adding a comment, first ask whether better naming or structure would remove the need for it.

Avoid comments that are:

* conversational
* educational for the agent
* process-related
* redundant
* speculative

Do not write comments such as:

```ts
// The user asked me to add this.
// This function creates a person.
// Maybe improve this later.
```

---

## 7.4 TODO and FIXME

Use `TODO`, `FIXME`, or similar markers only when:

* the issue is real
* the issue is specific
* the reason it cannot be solved now is known
* leaving it is deliberate

Do not leave vague future-work markers.

---

# 8. Architecture Boundaries

Dependency direction must protect Business/Application from technical details.

Conceptually:

```text
Presentation
↓
Application
↓
Port
↑
Infrastructure
↓
Prisma
↓
SQL Server
```

Infrastructure implements the abstractions required by Application.

Application must not know the concrete implementation.

---

# 9. Feature Organization

Organize code primarily by feature.

Example:

```text
src/
  features/
    people/
      application/
      infrastructure/
      presentation/
```

Only create layers that are currently needed.

Do not create empty:

```text
domain/
application/
infrastructure/
presentation/
```

folders simply to satisfy a diagram.

---

# 10. Application Layer

Application is responsible for:

* Use Cases
* Business Flow
* Application Validation
* Business Rules
* Ports required by Application
* Application-level Result / Failure contracts

Application must not import:

* Prisma
* generated Prisma types
* SQL Server details
* Next.js-specific APIs
* Infrastructure repositories
* framework-specific request/response objects

Application contracts should use Application-owned types.

---

# 11. Domain Layer

Create a Domain layer only when the feature has meaningful domain behavior that deserves independence from Application orchestration.

Possible examples:

* complex invariant
* Value Object
* domain calculation
* entity behavior
* state transition logic shared across use cases

Do not create Domain abstractions for simple CRUD merely to make the architecture appear more sophisticated.

---

# 12. Infrastructure Layer

Infrastructure owns technical implementations such as:

* Prisma
* SQL Server persistence
* repository implementation
* external APIs
* filesystem access
* messaging adapters
* framework infrastructure

Infrastructure may depend on Application contracts.

Application must not depend on Infrastructure.

---

# 13. Presentation Layer

Presentation owns interaction with users or external clients.

Examples:

* Next.js Pages
* React components
* Forms
* Server Actions
* Route Handlers
* API adapters
* UI state
* presentation mapping

Presentation may validate transport/form shape, but Business Rules must not live exclusively there.

Do not access Prisma directly from React UI components.

---

# 14. Vertical Slice Development

Develop real behavior end-to-end.

Preferred flow:

```text
Business Requirement
→ Application behavior
→ Port
→ Infrastructure
→ Presentation
→ Tests
→ Verification
```

Avoid horizontal development such as:

```text
all repositories
→ all services
→ all APIs
→ all UI
```

A slice should remain small enough to:

* understand
* test
* review
* verify

while still representing real behavior.

---

# 15. Before Implementing a Slice

Before implementation, establish at least:

* Business problem
* Actor
* Input
* Output
* involved database tables
* relevant relations
* confirmed Business Rules
* Validation rules
* Failure Cases
* required dependencies
* responsibility of each layer
* required Unit Tests
* required Integration Tests
* whether E2E is justified

Do not silently invent missing requirements.

---

# 16. Business Rules and Data Integrity

Important Business Rules must not exist only in the UI.

Depending on the rule, protection may belong in:

* Application
* Database Constraint
* Transaction
* or multiple layers

In this Database-first project, do not add a Database Constraint without explicit approval.

Application-level Business Rules may still be required when the Database does not yet enforce the same rule.

Database constraints and Application validation serve different responsibilities and may intentionally coexist.

---

# 17. TypeScript

* Keep TypeScript strict.
* Prefer precise types.
* Avoid `any` without a clear reason.
* Avoid unnecessary type assertions.
* Keep Infrastructure types out of Application.
* Define meaningful Result and Failure contracts.
* Do not confuse compile-time TypeScript typing with runtime validation.
* Prefer discriminated unions where they improve Result/Error clarity.
* Do not create generic types merely to reduce a few repeated lines.

---

# 18. Next.js

Next.js is a Delivery/Presentation mechanism.

It is not the Business Layer.

* Server Actions are adapters.
* Route Handlers are adapters.
* Pages should not own business rules.
* UI components should not directly manage persistence.
* Prisma should not be called directly from UI components.
* Business logic should not depend on Next.js lifecycle behavior.

Choose Server Action, Route Handler, or another delivery mechanism based on the actual flow.

Do not require one by convention when it is unnecessary.

---

# 19. Prisma

Prisma belongs to Infrastructure.

Rules:

* schema must originate from `prisma db pull`
* Prisma-generated types must not become Application contracts
* important introspected types and relations must be checked against the actual Database Contract
* repository implementation performs mapping between persistence and Application contracts where mapping is needed
* changing `schema.prisma` must not be treated as authorization to change SQL Server

---

# 20. Dependency Policy

Add a package only when it solves a real current problem.

Before adding a dependency, determine:

* what problem it solves
* why existing tools are insufficient
* whether a simpler solution exists
* maintenance cost
* lock-in
* runtime impact
* bundle impact where relevant
* security impact where relevant

Avoid dependencies introduced only because they are popular or convenient.

---

# 21. Testing Strategy

Testing is part of development.

Choose the test type according to the boundary and risk.

## Unit Tests

Use for:

* Application logic
* Business Rules
* Validation
* Pure functions
* Use Case behavior

Unit Tests should not require SQL Server.

---

## Integration Tests

Use for:

* Prisma repositories
* real SQL Server behavior
* queries
* persistence mapping
* transactions
* database constraint behavior when relevant

Integration Tests must run against an independent Test Database.

---

## E2E Tests

Use only for important user flows from Presentation through persistence.

Do not create E2E tests for every small behavior.

---

# 22. Test Database Safety

Development, Test, E2E, and Production databases must be isolated appropriately.

Automated tests must never run against Production.

Test configuration must never silently fall back to Development Database credentials.

If a required Test Database configuration is missing:

```text
Fail Fast
```

Do not continue using Development DB as fallback.

Before database-backed tests:

* verify the target database
* verify the intended environment
* avoid destructive operations outside Test DB

In this Database-first project, do not turn Prisma migrations into the source of truth for the Test Database unless that strategy is explicitly approved.

---

# 23. Error Handling

Handle errors according to their layer.

Infrastructure errors must not leak directly to users.

Prisma-specific errors must not become Presentation contracts.

Application failures should represent meaningful business/application outcomes.

User-facing error messages must be:

* Persian
* understandable
* actionable where practical

Do not treat unexpected technical errors as ordinary Business failures.

Do not expose:

* stack traces
* SQL details
* Prisma internals
* secrets
* sensitive identifiers unnecessarily

---

# 24. Transactions

Consider transactions when multiple writes must succeed or fail as one operation.

Examples:

* parent + child creation
* multiple related writes
* state transition plus audit/update
* operations where partial success creates invalid data

Do not introduce transactions around every simple single-write operation.

---

# 25. Security

* Never hard-code secrets.
* Never commit credentials.
* Keep local `.env` files out of Git.
* Do not trust user input.
* Do not log sensitive information unnecessarily.
* Use parameterized raw SQL if raw SQL is required.
* Do not expose internal database errors to users.
* Do not assume hiding a button provides authorization.
* Treat Authentication and Authorization changes as security-sensitive.

Sensitive information may include:

* National Code
* Mobile
* financial data
* credentials
* tokens
* internal identifiers depending on context

---

# 26. UI — Persian and RTL

The product UI is Persian and RTL.

Presentation should provide:

* correct RTL layout
* natural Persian text
* meaningful user labels
* clear Persian validation messages
* logical field ordering for Persian users
* RTL-aware navigation
* RTL-aware tables
* accessibility
* keyboard focus
* usable form labels

Technical values may use LTR inside controls where appropriate.

Examples:

* VIN
* Plate number
* Mobile
* Code
* License number
* Engine number
* Chassis number
* numeric identifiers

Do not blindly convert database column names into UI labels.

Design labels according to the user's mental model.

---

# 27. Performance

Performance work must be evidence-driven.

Without a demonstrated need:

* do not add complex caching
* do not denormalize
* do not add speculative query abstractions
* do not propose indexes without checking the Database Contract
* do not optimize hypothetical bottlenecks

For lists expected to grow, consider:

* pagination
* bounded queries
* required relations only
* appropriate query shape

---

# 28. Documentation

Documentation is part of engineering when it preserves useful project knowledge.

Review documentation impact when changing:

* setup
* environment variables
* database connection
* Prisma workflow
* architecture
* test workflow
* Business Rules
* public API
* deployment
* developer workflow

Do not create documentation files solely to increase documentation coverage.

Prefer updating an existing relevant document when possible.

---

# 29. Git Workflow

Git is part of development.

Branches should preferably represent a Feature or Vertical Slice.

Example:

```text
feature/people-create-person
```

Before a logical commit:

* review `git status`
* review relevant Diff
* verify no unwanted files
* verify no secrets
* verify no database backups
* run relevant tests
* review scope

Do not commit every tiny edit.

A commit should represent a logical checkpoint.

Examples:

```text
feat(people): add create person use case
test(people): add person repository integration tests
refactor(people): isolate prisma persistence
docs: update database setup guide
```

Commit messages must be:

* English
* concise
* meaningful

---

# 30. Git Safety

Do not perform the following without explicit user awareness:

* commit
* push
* merge
* rebase
* reset
* force push
* branch deletion
* history rewrite

Before Merge review:

* Scope
* Diff
* Tests
* Architecture
* Database safety
* Documentation
* uncommitted changes

---

# 31. Repository Hygiene

Do not commit unless deliberately required:

* `*.bak`
* database backups
* secrets
* credentials
* local `.env`
* temporary files
* build artifacts
* IDE noise
* unnecessary generated binaries

Generated files should only be committed when the repository intentionally versions them.

---

# 32. Refactoring Policy

Refactor when it is genuinely needed for the current task.

A refactor should have:

* clear purpose
* controlled scope
* verifiable behavior

Avoid mixing broad refactoring with feature implementation.

Avoid unrelated cleanup in the same Diff.

Do not rename files or symbols merely because another name is aesthetically preferable.

Rename when it materially improves:

* intent
* correctness
* consistency
* boundary clarity

---

# 33. Overengineering Guard

Before adding a:

* Pattern
* Layer
* abstraction
* base class
* service
* shared package
* framework
* generic repository
* infrastructure component

ask:

```text
Does this complexity solve a real problem in the current slice?
```

Avoid premature:

* Microservices
* CQRS frameworks
* Event Bus
* Message Broker
* Generic Repository frameworks
* broad base classes
* internal frameworks
* abstraction stacks
* speculative shared libraries
* future-client infrastructure

Prefer:

```text
simple
+ explicit
+ testable
+ replaceable
```

---

# 34. Future Clients

Business/Application code should not depend on Next.js.

Preserve the ability to support future:

* Desktop clients
* Mobile clients
* external API consumers

without prematurely building:

* mobile projects
* monorepo architecture
* shared SDK packages
* client abstraction frameworks

Preserve the boundary, not hypothetical infrastructure.

---

# 35. Agent Working Behavior

Before changing code, the Agent must:

1. inspect relevant context
2. inspect existing files before creating replacements
3. inspect nearby repository patterns
4. identify the owning feature
5. identify the owning layer
6. identify the relevant database contract
7. identify confirmed Business Rules
8. choose the smallest correct change

The Agent must not:

* recreate an existing capability without inspecting it
* invent a new naming convention without need
* introduce a parallel architecture
* create speculative folders
* create generic abstractions prematurely
* perform unrelated cleanup
* hide test failures
* hide incomplete verification
* introduce Persian technical code
* introduce vague naming
* add redundant comments
* silently change Database-related files
* silently add packages

If complete verification is impossible, explicitly state what remains unverified.

---

# 36. First-Pattern Rule

When a feature or architectural pattern is being implemented for the first time in FleetManagement, treat it as a reference pattern.

During that first implementation:

* prefer explicit structure
* keep changes small
* review file naming deliberately
* review Layer ownership deliberately
* review Port placement deliberately
* review Result/Error contracts deliberately
* review test placement deliberately
* avoid premature generic abstraction

Once the pattern is accepted:

```text
Existing FleetManagement Pattern
>
Agent preference
```

Future comparable slices should follow the established pattern unless there is a concrete reason to change it.

A pattern change must be intentional, justified, and scoped.

---

# 37. Verification

Agent claims are not evidence.

Before declaring a task complete, inspect relevant evidence.

At minimum consider:

* `git status`
* relevant Diff
* current Scope
* file ownership
* naming
* architecture direction
* Prisma leakage
* database safety
* dependency changes
* Business Rules
* Validation
* Failure Cases
* test coverage
* test results
* real behavior
* documentation impact

During review actively look for:

* Prisma imports inside Application
* persistence logic inside Presentation
* Business Rules living only in UI
* infrastructure types leaking upward
* vague filenames
* generic abstractions
* content-first file naming where concept-first naming is clearer
* duplicated repository conventions
* unnecessary package additions
* accidental database changes
* missing validation
* missing failure behavior
* redundant comments
* Persian technical code
* tests coupled only to implementation details
* Development DB used by automated tests
* unrelated files in Diff

Principle:

```text
Evidence > Claim
```

---

# 38. Build and Validation Commands

Never guess project commands.

Inspect:

* `package.json`
* configuration files
* repository documentation

Use the existing scripts where available.

Depending on the task, consider:

* lint
* type-check
* unit tests
* integration tests
* e2e tests
* production build
* Prisma validation
* Prisma generation

Do not run irrelevant expensive verification merely for appearance.

Run the verification appropriate to the change and risk.

If a new command becomes part of the developer workflow, review whether documentation needs updating.

---

# 39. Definition of Done

A Task or Feature is not Done merely because code exists.

Before Done, verify as relevant:

* Requirement is satisfied.
* Scope is respected.
* Database Contract is preserved.
* Architecture Boundary is preserved.
* Repository conventions are followed.
* File names communicate concept and responsibility.
* Naming is meaningful and consistent.
* Technical code is English.
* Persian exists only in appropriate user-facing UI strings.
* Comments are necessary and meaningful.
* Validation is sufficient.
* Failure Cases are handled.
* Business Rules are implemented in the correct layer.
* Required Unit Tests exist.
* Required Integration Tests exist.
* E2E exists only where justified.
* Tests pass.
* Build/Lint/Type-check pass where relevant.
* Test DB safety is preserved.
* Diff has been reviewed.
* No unnecessary dependency was added.
* No unintended database change occurred.
* UI is Persian and RTL where relevant.
* Documentation is updated where needed.
* Git state is understandable.
* No secret or unwanted file is included.

---

# 40. Decision Principle

When uncertain, follow:

```text
Evidence
→ Understand the Concept
→ Respect Existing Convention
→ Smallest Correct Change
→ Tests
→ Diff Review
→ Done
```

Prefer clarity over cleverness.

Prefer explicit behavior over hidden convention.

Prefer a stable concept over a temporary implementation detail.

Prefer an existing good FleetManagement pattern over inventing a new one.

Speed matters, but never at the cost of:

* Data Integrity
* Scope
* Architecture
* Security
* Test Safety
* Maintainability
