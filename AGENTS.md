# AGENTS.md — FleetManagement

## هدف این فایل

این فایل قوانین پایدار و Repository-level برای Agentهای کدنویسی پروژه FleetManagement را تعریف می‌کند.

این فایل برای نگهداری وضعیت روز پروژه، Progress، Scope یک فاز خاص یا تصمیم‌های موقت نیست.

Agent باید:
- فقط در محدوده Task فعلی کار کند.
- معماری و Database Contract را حفظ کند.
- تغییرات را با Evidence بررسی کند.
- از تغییر ناخواسته Database، Scope creep و Overengineering جلوگیری کند.

در صورت تعارض بین درخواست فعلی و قوانین این فایل، تعارض را قبل از پیاده‌سازی اعلام کن.

---

## Project Overview

FleetManagement یک سامانه مدیریت ناوگان با رابط کاربری فارسی و RTL است.

Stack اصلی پروژه:

- Next.js
- React
- TypeScript
- SQL Server
- Prisma ORM به روش Database-first

معماری ترجیحی:

- Feature-based Architecture
- Layered Architecture
- Vertical Slice Development

هدف معماری این است که Business/Application Logic تا حد ممکن مستقل از Framework، ORM و نوع Client باقی بماند تا در آینده Clientهای دیگری مانند Desktop یا Mobile قابل اضافه شدن باشند.

---

## اصل Scope

فقط در محدوده‌ای که در Task فعلی مشخص شده کار کن.

وجود یک Table، Domain، Route، Folder یا Feature در Repository یا Database به معنی مجاز بودن تغییر آن نیست.

بدون نیاز مستقیم Task و تأیید صریح:

- وارد Domain جدید نشو.
- Feature جدید نساز.
- Refactor گسترده انجام نده.
- Table خارج از محدوده را تغییر نده.
- قابلیت آینده را زودتر از موعد پیاده‌سازی نکن.
- API یا UI اضافی که Requirement نشده نساز.

اگر انجام صحیح Task نیازمند خروج از Scope است:

1. دلیل را توضیح بده.
2. اثر تغییر را مشخص کن.
3. گزینه ساده‌تر داخل Scope را بررسی کن.
4. قبل از ادامه تأیید بگیر.

---

## Database-first

SQL Server موجود Source of Truth مدل داده است.

هیچ‌کدام از موارد زیر را حدس نزن:

- Table name
- Column name
- Data type
- Primary Key
- Foreign Key
- Identity
- Nullable
- Default
- Unique Constraint
- CHECK Constraint
- Index
- Relation
- Cardinality

مسیر صحیح Prisma:

SQL Server
→ prisma db pull
→ schema.prisma
→ Prisma Client

Prisma مصرف‌کننده Database است، نه طراح آن.

### ممنوع بدون تأیید صریح

- اجرای `prisma migrate dev`
- ساخت Migration
- `prisma db push`
- ایجاد Table
- تغییر Column
- حذف یا اضافه کردن Relation
- تغییر Constraint
- تغییر Index
- اجرای SQL ساختاری یا مخرب

اگر به نظر می‌رسد Database نیاز به تغییر دارد، ابتدا گزارش کن:

- مشکل چیست؟
- چرا تغییر لازم است؟
- چه داده یا Featureهایی تحت تأثیر قرار می‌گیرند؟
- Trade-off چیست؟
- آیا راه‌حل Application-level وجود دارد؟

سپس منتظر تأیید بمان.

---

## Architecture Boundaries

Dependency Direction باید به سمت Business/Application باشد.

الگوی مطلوب:

Presentation
↓
Application
↓
Port / Interface
↓
Infrastructure
↓
Prisma
↓
SQL Server

### Application Layer

Application نباید مستقیماً به این موارد وابسته باشد:

- Prisma
- Prisma Client types
- SQL Server
- Next.js Server APIs
- Route Handler implementation
- Server Action implementation
- Persistence details

Application باید Use Case، Business Flow، Validation و قراردادهای موردنیاز خود را تعریف کند.

### Infrastructure Layer

Infrastructure مسئول جزئیات فنی است، مانند:

- Prisma
- SQL Server access
- Repository implementation
- External services
- Framework adapters

### Presentation Layer

Presentation مسئول تعامل با User یا Client است، مانند:

- Page
- Form
- Server Action
- Route Handler
- API Adapter
- UI state

Business Rule را در Presentation دفن نکن.

### Domain Layer

Domain فقط وقتی ایجاد شود که واقعاً Domain Logic مستقل و قابل‌توجه وجود دارد.

Folder یا Layer خالی صرفاً برای ظاهر معماری نساز.

---

## Feature Organization

کد ترجیحاً بر اساس Feature سازمان‌دهی شود، نه بر اساس نوع فایل در کل پروژه.

نمونه مفهومی:

src/
  features/
    people/
      application/
      infrastructure/
      presentation/

هر Feature فقط Layerهایی را داشته باشد که واقعاً نیاز دارد.

از ایجاد Structure پیچیده قبل از وجود نیاز واقعی خودداری کن.

---

## Vertical Slice Development

توسعه باید یک رفتار واقعی را End-to-End کامل کند.

الگوی ترجیحی:

Business Requirement
→ Use Case
→ Port
→ Infrastructure
→ Presentation
→ Tests
→ Verification

روش نامطلوب:

- ساخت همه Repositoryها
- سپس همه Use Caseها
- سپس همه APIها
- سپس همه UIها

هر Slice باید تا حد معقول قابل اجرا، قابل تست و قابل Review باشد.

---

## قبل از پیاده‌سازی Feature

قبل از نوشتن کد، حداقل این موارد را مشخص کن:

- Business problem چیست؟
- Actor چه کسی است؟
- Input چیست؟
- Output چیست؟
- چه داده‌هایی درگیرند؟
- چه Relationهایی مهم‌اند؟
- Business Ruleها چیست؟
- Validationها چیست؟
- Failure Caseها چیست؟
- Dependencyهای Feature چیست؟
- چه نوع Testهایی لازم است؟
- مسئولیت هر Layer چیست؟

اگر یکی از این موارد برای پیاده‌سازی ضروری است ولی مشخص نیست، حدس نزن.

---

## TypeScript

- TypeScript باید در حالت strict باقی بماند.
- تا جای ممکن از Typeهای دقیق استفاده کن.
- از `any` بدون دلیل روشن استفاده نکن.
- Error و Result shapeها را صریح طراحی کن.
- Typeهای Infrastructure را به Application leak نده.
- Type assertion غیرضروری (`as`) را کاهش بده.
- Runtime Validation را با TypeScript type safety اشتباه نگیر.

---

## Next.js

Next.js یک Presentation/Delivery mechanism است، نه محل Business Logic.

- Server Action فقط Adapter است.
- Route Handler فقط Adapter است.
- Page و Component نباید Persistence را مستقیماً مدیریت کنند.
- Prisma Client را مستقیماً از UI Component صدا نزن.
- Business Rule را به Framework lifecycle وابسته نکن.

Server Action یا Route Handler را بر اساس نیاز همان Flow انتخاب کن؛ هیچ‌کدام به‌طور پیش‌فرض الزامی نیست.

---

## Prisma

Prisma فقط در Infrastructure استفاده شود.

- Schema باید از Database واقعی با `prisma db pull` حاصل شود.
- تغییر `schema.prisma` نباید به معنی تغییر Database تلقی شود.
- بعد از Introspection، Relationها و Typeهای مهم با Database Contract بررسی شوند.
- Prisma-generated types نباید قرارداد Application شوند.
- Repository implementation مسئول Mapping بین Prisma و Application باشد.

---

## Dependency Policy

Package جدید فقط زمانی اضافه شود که مشکل واقعی فعلی را حل کند.

قبل از افزودن Dependency مشخص کن:

- چه مشکلی را حل می‌کند؟
- چرا امکانات فعلی کافی نیست؟
- گزینه ساده‌تر چیست؟
- Maintenance cost آن چیست؟
- آیا Lock-in یا Complexity اضافه می‌کند؟

از Dependency برای راحتی جزئی یا Trend-following پرهیز کن.

---

## Testing Strategy

Testing بخشی از Development است.

نوع Test بر اساس Risk و Boundary انتخاب شود.

### Unit Test

برای:

- Application logic
- Business rules
- Validation
- Pure functions
- Use case behavior

### Integration Test

برای:

- Prisma Repository
- SQL Server behavior
- Query
- Mapping
- Constraint behavior
- Transaction behavior

### E2E Test

فقط برای Flowهای مهم User از Presentation تا Database.

برای هر رفتار کوچک E2E نساز.

---

## Test Database Safety

Development، Integration Test، E2E و Production Database باید از هم جدا باشند.

هرگز Test عادی را روی Production اجرا نکن.

قبل از اجرای Testهای دارای Database:

- Connection target را بررسی کن.
- مطمئن شو Test DB است.
- در صورت نیاز از SQL Server جداگانه یا Docker استفاده کن.

هیچ Test نباید به داده Production وابسته باشد.

---

## Verification

Claim یک Agent یا سبز بودن Build به‌تنهایی کافی نیست.

قبل از اعلام Done بودن تغییر، Evidence جمع کن.

حداقل بررسی کن:

- `git status`
- Diff مرتبط
- Scope
- Architecture boundary
- Database safety
- Dependency changes
- Test coverage
- Test results
- رفتار واقعی Feature

در Review به‌خصوص دنبال این موارد باش:

- Prisma leak به Application
- Business Logic در Presentation
- تغییر ناخواسته DB
- Refactor خارج از Scope
- Dependency غیرضروری
- Validation جاافتاده
- Error handling ناقص
- تستی که فقط implementation detail را تست می‌کند

اصل:

Evidence > Claim

---

## Build / Validation Commands

قبل از اعلام تکمیل Task، Commandهای موجود Repository را بررسی و Command صحیح همان پروژه را اجرا کن.

در صورت وجود Scriptهای استاندارد، ترجیحاً این دسته‌ها بررسی شوند:

- development
- lint
- type-check
- unit tests
- integration tests
- e2e tests
- production build

Command یا Script را حدس نزن؛ ابتدا `package.json` یا تنظیمات Repository را بررسی کن.

اگر Command جدید به Workflow اضافه شد، Documentation مرتبط نیز بررسی شود.

---

## UI فارسی و RTL

UI محصول فارسی است.

Presentation باید:

- RTL باشد.
- متن فارسی طبیعی و قابل فهم داشته باشد.
- Labelها بر اساس Mental Model کاربر طراحی شوند.
- Validation Message واضح و فارسی باشد.
- ترتیب Fieldها برای فرم فارسی منطقی باشد.
- Table و Navigation برای RTL مناسب باشند.
- Accessibility فراموش نشود.

مقادیر فنی در صورت نیاز LTR باشند، مانند:

- VIN
- Plate number
- Mobile
- Code
- License number
- Engine number
- Chassis number
- Numeric identifiers

Database column name را کورکورانه به UI label تبدیل نکن.

---

## Error Handling

Error handling باید متناسب با Layer باشد.

- Infrastructure error را مستقیم به User نمایش نده.
- Prisma error نباید به Presentation leak کند.
- Application failure باید معنا و Contract مشخص داشته باشد.
- User-facing message باید فارسی، روشن و قابل اقدام باشد.
- Errorهای غیرمنتظره را با Errorهای Business یکی نکن.

---

## Security

- Secret را Hard-code نکن.
- `.env` و Credentialها را Commit نکن.
- ورودی User را Trust نکن.
- Authorization را صرفاً بر اساس مخفی بودن UI فرض نکن.
- اطلاعات حساس را بی‌دلیل Log نکن.
- SQL خام در صورت نیاز باید Parameterized و Review شده باشد.
- Error داخلی، Stack trace و Database detail را به User نمایش نده.

اگر Task روی Authentication/Authorization اثر دارد، آن را به‌عنوان تغییر حساس گزارش کن.

---

## Data Integrity

Business Rule مهم را فقط در UI enforce نکن.

بسته به نوع Rule بررسی کن آیا باید در:

- Application
- Database Constraint
- Transaction
- یا ترکیبی از آن‌ها

محافظت شود.

در پروژه Database-first هیچ Constraint جدیدی بدون تأیید اضافه نکن.

---

## Transactions

برای عملیات چندمرحله‌ای که باید Atomic باشند، Transaction را بررسی کن.

نمونه:

- چند Write وابسته
- ایجاد Parent و Child
- Update چند Entity مرتبط
- عملیاتی که Partial success نامعتبر ایجاد می‌کند

Transaction را هم بی‌دلیل روی هر Operation ساده اضافه نکن.

---

## Performance

Performance optimization باید Evidence-driven باشد.

بدون مشکل واقعی:

- Cache پیچیده اضافه نکن.
- Denormalization پیشنهاد نده.
- Query optimization زودهنگام انجام نده.
- Index جدید بدون بررسی Database Contract پیشنهاد نکن.

برای Listهای قابل رشد، Pagination و Query shape را در نظر بگیر.

---

## Documentation

Documentation بخشی از Engineering است، اما فقط وقتی ارزش عملی دارد.

Documentation را بررسی یا Update کن اگر تغییر روی این موارد اثر دارد:

- Setup
- Environment
- Database connection
- Prisma workflow
- Architecture
- Testing workflow
- Business rule مهم
- Public API
- Deployment
- Developer workflow

Documentation فقط برای افزایش تعداد فایل‌ها ایجاد نکن.

---

## Git Workflow

Git بخشی از Development Workflow است.

Branchها ترجیحاً Feature/Slice محور باشند.

نمونه:

`feature/people-create-person`

قبل از Commit:

- `git status` را بررسی کن.
- Diff را Review کن.
- فایل ناخواسته را حذف کن.
- Secret را بررسی کن.
- Database backup را بررسی کن.
- Testهای لازم را اجرا کن.

Commit باید یک Logical Checkpoint باشد، نه هر تغییر کوچک.

نمونه Commit Message:

- `feat(people): add create person use case`
- `test(people): add repository integration tests`
- `refactor(people): isolate prisma persistence`
- `docs: update database setup guide`

---

## Git Safety

بدون آگاهی صریح User این عملیات را انجام نده:

- commit
- push
- merge
- rebase
- reset
- force push
- branch deletion
- history rewrite

قبل از Merge بررسی کن:

- Scope
- Diff
- Tests
- Architecture
- Database safety
- Documentation
- Uncommitted changes

---

## Repository Hygiene

این موارد نباید وارد Repository شوند مگر با دلیل و تأیید مشخص:

- Database backups (`*.bak`)
- Secrets
- Credentials
- Local-only environment files
- Build artifacts
- Temporary files
- IDE-specific noise
- Large generated binaries

Generated files فقط زمانی Commit شوند که Repository عمداً آن‌ها را Version Control می‌کند.

---

## Refactoring Policy

Refactor فقط وقتی انجام شود که:

- برای Task فعلی لازم باشد،
- Risk قابل کنترل باشد،
- رفتار موجود قابل Verification باشد.

Refactor گسترده را با Feature change مخلوط نکن مگر ضرورت روشن داشته باشد.

از Cleanupهای نامرتبط در همان Diff پرهیز کن.

---

## Overengineering Guard

قبل از افزودن Pattern، Layer، Abstraction یا Technology بپرس:

«آیا این پیچیدگی الآن مسئله واقعی پروژه را حل می‌کند؟»

بدون نیاز روشن از این موارد پرهیز کن:

- Microservices
- CQRS کامل
- Event Bus
- Message Broker
- Generic Repository پیچیده
- Base classes فراگیر
- Framework داخلی اختصاصی
- Abstraction چندلایه بدون Use Case واقعی
- Design Pattern صرفاً برای ظاهر معماری

Simple + explicit + testable ترجیح دارد.

---

## Future Clients

Business/Application Logic نباید به Next.js وابسته باشد.

معماری باید امکان Clientهای دیگر مانند:

- Desktop
- Mobile
- External API consumer

را در آینده حفظ کند.

این به معنی ساختن Mobile یا Shared Package از الان نیست.

فقط Boundary را طوری حفظ کن که Rewrite غیرضروری ایجاد نشود.

---

## Agent Behavior

Agent باید قبل از تغییر:

1. Context مرتبط را بررسی کند.
2. فایل‌های موجود را قبل از ساخت جایگزین بررسی کند.
3. Pattern موجود Repository را بشناسد.
4. کوچک‌ترین تغییر کافی را انتخاب کند.

Agent نباید:

- فایل موجود را بدون بررسی دوباره‌سازی کند.
- Pattern جدید را بدون نیاز وارد کند.
- Architecture جدیدی موازی با Architecture موجود بسازد.
- صرفاً برای «تمیزتر شدن» Scope را گسترش دهد.
- Failure یا Test شکست‌خورده را پنهان کند.

اگر Verification کامل ممکن نبود، صریح بگو چه چیزی Verify نشده است.

---

## Definition of Done

یک Task یا Feature فقط با نوشته شدن کد Done نیست.

قبل از Done بررسی کن:

- Requirement برآورده شده است.
- Scope رعایت شده است.
- Database Contract حفظ شده است.
- Architecture Boundary حفظ شده است.
- Validation کافی است.
- Failure Caseهای لازم پوشش داده شده‌اند.
- Testهای متناسب وجود دارند.
- Testها Pass شده‌اند.
- Build/Lint در صورت مرتبط بودن Pass شده‌اند.
- Diff Review شده است.
- Dependency غیرضروری اضافه نشده است.
- UI فارسی/RTL در صورت مرتبط بودن صحیح است.
- Documentation لازم Update شده است.
- Git state قابل فهم است.
- Database ناخواسته تغییر نکرده است.

---

## در صورت شک

اصل تصمیم‌گیری:

Evidence
→ Decision
→ Smallest Correct Change
→ Tests
→ Diff Review
→ Done

سرعت مهم است، اما نه به قیمت Data Integrity، Scope، Architecture یا Maintainability.