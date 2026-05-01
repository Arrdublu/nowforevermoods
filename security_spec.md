# Security Specification for NowForeverMoods Booking

## Data Invariants
1. A **User** profile can only be created by the owner and their `role` must be 'user' initially (unless they are the pre-configured admin).
2. A **Booking** must belong to the authenticated user (`userId` matches `request.auth.uid`).
3. **Packages** are read-only for public, and only editable by users with the 'admin' role.
4. **Transactions** are system-generated (usually updated via webhook, but in client-auth context, they must be secure).
5. No user can delete a Booking once it is 'confirmed' (Admin only).
6. Admin role can only be granted by existing Admins.

## The Dirty Dozen Payloads (Targeting Vulnerabilities)

1. **Privilege Escalation**: `PATCH /users/my-uid { "role": "admin" }` - User trying to make themselves admin.
2. **ID Poisoning**: `POST /bookings/junk-id-!!!-$$$ { ... }` - Injecting malformed IDs.
3. **Identity Spoofing**: `POST /bookings { "userId": "victim-uid", ... }` - Creating a booking for someone else.
4. **Resource Exhaustion**: `POST /packages { "description": "A" * 10^6 }` - Sending massive strings.
5. **State Shortcut**: `POST /bookings { "status": "confirmed", "paymentStatus": "paid" }` - Skipping the payment flow.
6. **Orphaned Write**: `POST /bookings { "packageId": "non-existent-id" }` - Referencing a non-existent package.
7. **Cross-User Leak**: `GET /bookings` - Trying to list all bookings without being admin.
8. **Shadow Field**: `POST /packages { "name": "Classic", "usdPrice": 500, "isHiddenFromTax": true }` - Injecting fields not in schema.
9. **Timestamp Spoofing**: `POST /bookings { "createdAt": "2020-01-01" }` - Set old creation date.
10. **Admin Lockdown**: `PATCH /packages/{id} { "usdPrice": 0 }` - Non-admin trying to zero out prices.
11. **PII Leak**: `GET /users/{other-uid}` - Reading other users' profile data.
12. **Update Gap**: `PATCH /bookings/{id} { "status": "confirmed" }` - Bypassing payment requirements.

## Draft Rules Strategy
- Use `isValidId()` for path variables.
- Use `isValidUser()`, `isValidBooking()`, `isValidPackage()`.
- Use `isAdmin()` helper check against `/users/$(request.auth.uid)`.
- Use `affectedKeys().hasOnly()` for specific updates.
