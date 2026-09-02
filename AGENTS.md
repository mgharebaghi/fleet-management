AGENTS.md — FleetManagement

Purpose

This file defines stable, repository-level engineering rules for coding agents working on FleetManagement.

It is not a project journal and must not be used to store:

current progress

temporary decisions

session notes

phase-specific status

current backlog

implementation history

Agents must:

work only within the current task scope

preserve the database contract

preserve architecture boundaries

follow repository conventions

use evidence before claiming completion

avoid unintended database changes

avoid scope creep

avoid unnecessary abstractions

produce readable, explicit, maintainable code

clean up processes started during agent execution

If the current task conflicts with these rules, report the conflict before implementation.

1. Non-Negotiable Rules

1.1 Database Safety

SQL Server is the source of truth for the data model.

Never change the existing database structure without explicit approval.

Do not run or create:

prisma migrate dev

Prisma migrations

prisma db push

schema-changing SQL

destructive SQL

Table changes

Column changes

Constraint changes

Index changes

Relation changes

unless explicitly approved.

Prisma is a consumer of the database, not its designer.

Correct flow:

SQL Server
→ prisma db pull
→ schema.prisma
→ Prisma Client

Never reverse this flow unless a separate database-design decision has been explicitly approved.

1.2 Scope Safety

Only modify what is required by the current task.

Do not expand into another:

feature

domain

table

route

component

refactor

API

UI flow

without a direct requirement.

The presence of a Prisma model does not authorize implementation of that domain.

1.3 Architecture Boundary

Preferred architecture:

Feature-based Architecture

Layered Architecture

Vertical Slice Development

Application code must not depend on:

Prisma

Prisma Client types

SQL Server

Infrastructure implementations

Next.js Server APIs

Server Actions

Route Handler implementations

persistence details

Prisma belongs to Infrastructure.

Use Ports/Repositories when needed to keep Application independent from persistence.

Do not create empty layers or folders just to match an architectural template.

1.4 Repository Convention

Existing acceptable FleetManagement conventions take precedence over agent preference.

Do not invent a new naming, folder, architecture, testing, or styling pattern when an established repository pattern already solves the same problem.

For the first implementation of a new pattern, prefer the smallest clear structure that can become the reference pattern for future slices.

Naming must be:

semantic

meaningful

consistent

concept-first

responsibility-based

Avoid generic names such as helper.ts, types.ts, utils.ts, or input.ts when a more specific name is available.

1.5 Code Language

All technical code must be written in English.

Persian is allowed only for text directly shown to the user in the Persian UI.

1.6 Evidence Before Done

A successful build or an agent claim is not sufficient evidence.

Before claiming completion, review the relevant:

Diff

Git state

Scope

Architecture

Database safety

Tests

behavior

documentation impact

runtime process cleanup

2. Project Context

FleetManagement is a fleet-management application with a Persian RTL user interface.

Main stack:

Next.js

React

TypeScript

SQL Server

Prisma ORM using Database-first

Business/Application logic should remain independent from framework and persistence details where practical.

Do not introduce speculative abstractions for future Desktop, Mobile, Monorepo, Microservices, or external APIs unless the current task genuinely needs them.

3. Database Contract

Never guess database details.

Verify from the real SQL Server database and the introspected Prisma schema where applicable:

field names

SQL types

PK/FK

Identity

Nullable

Defaults

Unique Constraints

CHECK Constraints

indexes

relations

cardinality

If the database contract and assumptions conflict, stop and report the conflict.

Do not silently “fix” the database from application code.

4. Vertical Slice Development

Develop real behavior end-to-end.

For each slice, consider:

Business Problem

Actor

Input

Output

Tables/Relations involved

Business Rules

Failure Cases

Tests

Architecture placement

Dependencies created for later slices

Prefer completing one coherent behavior across required layers instead of building many partial abstractions.

5. Layer Responsibilities

Domain

Use only when real domain concepts or rules justify it.

Do not create a Domain layer merely because the architecture name includes it.

Application

Owns use-case orchestration, business validation, application contracts, and Ports.

Must remain independent from Prisma, SQL Server, Next.js infrastructure, and UI implementation details.

Infrastructure

Owns technical details such as:

Prisma

SQL Server access

persistence mapping

repository implementations

infrastructure configuration

Infrastructure may depend inward on Application contracts.

Application must not depend outward on Infrastructure.

Presentation

Owns:

UI

form/transport parsing

action state

presentation-specific mapping

user-facing validation messages

RTL behavior

navigation behavior

Business rules must not be duplicated in Presentation.

Composition

Composition Root wires concrete dependencies together.

Prefer simple explicit wiring.

Do not introduce a DI container or framework unless the project actually needs one.

6. Mapping

Do not leak Prisma models or Prisma-generated types into Application.

Mapping between persistence models and Application models belongs in Infrastructure.

Database-managed values must remain database-managed unless the application contract explicitly requires otherwise.

7. Validation and Business Rules

Do not invent business rules.

Rules must come from:

confirmed requirements

database constraints

explicit project decisions

existing established behavior

Normalize input where required before validation and persistence.

Do not make Presentation the source of business validation.

8. Testing

Testing is part of development.

Use the smallest test level that proves the behavior:

Unit Test: Business/Application logic

Integration Test: Repository / Prisma / SQL Server

E2E: Important UI-to-database flows

Do not create E2E tests for every small behavior.

Development DB, Integration Test DB, E2E Test DB, and Production DB must be isolated as required.

Automated tests must never run against Production.

Test configuration must fail fast if the required Test DB configuration is missing.

Never fall back from Test/E2E configuration to Development DB.

In this Database-first project, Test DB must not become the source of truth through Prisma migrations unless separately approved.

9. Runtime Process Safety

Track processes started by the agent for the current task.

After verification, stop processes started by the agent when they are no longer needed.

Do not blindly kill all node.exe, database, browser, or unrelated system processes.

Only terminate processes that can be identified as belonging to the current task/repository.

Be alert to stale development processes holding old environment variables or runtime state.

10. UI / UX

The application UI is Persian and RTL.

Requirements:

main direction is RTL

Persian labels must be natural and user-oriented

layout/order must make sense in RTL

validation messages must be clear Persian

code-like values such as VIN, Mobile, NationalCode, Plate, CardNo, and technical identifiers may use LTR inside controls where appropriate

Do not translate database column names mechanically.

Use labels that make sense to the user.

Prefer a clean, modern, enterprise-oriented UI over decorative complexity.

Shared visual rules such as typography, color, spacing, radius, and reusable UI tokens should live in shared styling rather than being duplicated per page.

Do not add a large UI framework unless required.

11. Dependencies

Before adding a package, verify that it solves a real current problem.

Prefer built-in platform/framework capabilities or existing dependencies when they are sufficient.

Avoid unnecessary dependencies, especially for simple utilities, formatting, validation, DI, or UI.

If adding a dependency, explain why it is needed and what simpler alternative was rejected.

12. Documentation

Documentation is part of Definition of Done when the change affects project usage or engineering decisions.

Review whether changes require updates to:

README

setup instructions

environment configuration

database / Prisma guide

testing workflow

architecture notes

business rules

feature documentation

API documentation

Do not create documentation files with no clear ongoing value.

13. Git / GitHub

Git operations must be intentional.

Before a logical checkpoint:

inspect git status

inspect the relevant Diff

ensure no secrets or unwanted files are included

ensure scope is correct

ensure tests/evidence are sufficient

Use logical commits, not one commit per tiny file change.

Commit messages should clearly describe the completed unit of work.

Do not Commit, Push, Merge, Rebase, Reset, force-push, or delete branches without explicit user awareness/approval.

Prefer slice-oriented branches such as:

feature/people-create-person
feature/people-list
feature/fleet-create-vehicle

Before Merge/PR completion, review:

Scope

Diff

Tests

DB safety

Architecture boundaries

Documentation

unwanted files

secrets

14. Secrets and Sensitive Files

Never commit:

.env

passwords

database credentials

tokens

private keys

production secrets

SQL Server backup files

generated secrets

Use environment variables and safe example files such as .env.example.

If a secret is exposed in logs, uploaded artifacts, or tracked files, report it and recommend rotation.

15. Comments and Code Clarity

Prefer self-explanatory code.

Comments should mainly explain:

why

constraints

trade-offs

non-obvious business rules

safety decisions

Do not add comments that merely restate what the code obviously does.

16. Overengineering Guardrail

Always ask:

Is this complexity actually necessary at this stage?

Avoid premature:

generic frameworks

abstraction layers

factories

DI containers

shared libraries

monorepo structure

event systems

plugin architectures

generalized CRUD engines

Prefer explicit, local, understandable code until repetition or complexity justifies abstraction.

17. Completion Checklist

Before reporting a task as complete, verify as relevant:

requirement satisfied

scope respected

database contract preserved

no unapproved DB change

architecture boundaries preserved

validation/failure cases covered

tests appropriate and passing

real behavior verified where necessary

UI/RTL correct

documentation reviewed

Git diff/status reviewed

no secret/unwanted file introduced

runtime processes cleaned up

no unnecessary dependency added

If any item is unknown, state that clearly instead of claiming completion.

<!-- BEGIN:nextjs-agent-rules -->

This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in node_modules/next/dist/docs/ (resolved from this file's directory; in monorepos the next package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by next dev — verify at node_modules/next/dist/server/lib/generate-agent-files.js. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->