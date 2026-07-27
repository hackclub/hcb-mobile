# HCB Mobile — Feature Parity Planning & Implementation

**Session:** Jul 7, 2026  
**Project:** HCB Mobile (Hack Club Bank) — React Native + Expo Router  
**Scope:** Full-stack feature parity between HCB web (Rails) and mobile app; Wave 1 implementation across both codebases

---

## 👤 User

Create a plan to completely copy the UI of the web into a mobile format by using the hcb working directory which is a Ruby on Rails app. Furthermore, proceed to attain near 1:1 parity of CORE features that web supports and mobile doesnt through updating the hcb codebase to add v4 API endpoints and adding UI screens and logic to mobile app.

---

## 🤖 Claude

I'll start by exploring both codebases in parallel to understand the full scope: the web app's core features, the existing v4 API structure, and what the mobile app already covers.

---

## 🤖 Claude

`[tool: Agent → Map HCB web core features]`

---

## 🤖 Claude

`[tool: Agent → Map HCB v4 API structure]`

---

## 🤖 Claude

`[tool: Agent → Map mobile app features]`

---

## 🤖 Claude

I've launched three parallel exploration agents to map the web app's core features, the v4 API architecture, and the mobile app's existing feature set. I'll wait for them to complete before designing the plan.

---

## 🤖 Claude

The v4 API architecture agent has completed. Waiting on the web features and mobile inventory agents.

---

## 🤖 Claude

Two agents done. Waiting on the mobile inventory agent to complete the picture.

---

## 🤖 Claude

All three explorations are complete. I now have a full three-way picture: the web app's ~30 feature domains, the exact v4 API pattern for adding endpoints (Jbuilder + Pundit `_in_v4?` policies + cursor pagination), and the ~13 domains the mobile app already covers.

Before I design the plan, the scope here is very large — the web app has roughly a dozen core domains that mobile doesn't cover yet (wire/Wise/PayPal transfers + payees, transaction categorization/pinning/disputes, recurring donations & tiers, invoice void/refund, reimbursement approvals, org & user settings editing, team/spending controls, personal feed/tasks/inbox, documents, announcements, G Suite, employees/payroll, statements/exports, and more). A few decisions will fundamentally shape the plan, so let me confirm them with you.

---

## 🤖 Claude

`[tool: AskUserQuestion]`

---

## 🤖 Claude

Wave 1 is set: **Transfers parity**, **Transaction & money actions**, and **Settings & team** — with native adaptation and a phased roadmap. Let me design the execution-ready detail for these three domains in parallel, while I read key grounding files myself.

---

## 🤖 Claude

`[tool: Agent → Design Wave 1 transfers parity]`

---

## 🤖 Claude

`[tool: Agent → Design Wave 1 transaction actions]`

---

## 🤖 Claude

`[tool: Agent → Design Wave 1 settings and team]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb-mobile/lib/client.ts]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb-mobile/app/(app)/(events)/[id]/transfers/index.tsx]`

---

## 🤖 Claude

Good grounding. Notably, the transfers ledger page currently uses **mock data** because no v4 transfers-list endpoint exists — that's a real gap to fold in. The `getClient()` ky pattern and screen conventions are clear. Now waiting on the three Wave 1 Plan agents.

---

## 🤖 Claude

The transfers plan is very detailed. Waiting on transaction-actions and settings-team agents.

---

## 🤖 Claude

Two of three Wave 1 plans in. Waiting on the settings & team agent.

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb-mobile/app/(app)/(events)/[id]/index.tsx]`

---

## 🤖 Claude

The org dashboard uses ActionTile/ActionChip and `OrgPolicy` for gating — the established pattern I'll extend for settings. Waiting on the settings & team plan agent to finish.

---

## 🤖 Claude

All three Wave 1 designs are complete, plus one important discovery: the mobile team screen already calls `DELETE organizations/:id/users/:id`, but **that v4 route doesn't exist** — member removal is currently broken and falls through to the not-found catch-all. I'll fold that fix into Wave 1. I now have everything needed to write the plan.

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/.claude/plans/create-a-plan-to-lovely-lighthouse.md]`

---

## 🤖 Claude

The plan is written. Here's a summary of what it covers:

**Structure** — a phased roadmap. It opens with the **repeatable two-sided pattern** (Rails v4 endpoint: route in the `api/v4` block → controller inheriting `Api::V4::ApplicationController` with mandatory `authorize` → Jbuilder view → `_in_v4?` policy; Mobile: `useOfflineSWR` read → `useClient()` mutation → `lib/types` → `lib/policies` gating → screen registered in `_layout.tsx`), so every wave is mechanical.

**Wave 1 (execution-ready)** — the three domains you selected:
1. **Transfers parity** — Wire/Wise/PayPal controllers, saved payees + payment-recipient picker, dynamic per-country/currency requirements endpoints, and a real transfers-list endpoint to replace the current `MOCK_TRANSFERS`.
2. **Transaction & money actions** — categorize/tag/pin/dispute on transactions, tag-suggestion accept/reject, and invoice void/refund/mark-paid/archive + check/ACH cancel, all surfaced via action sheets on the detail screens.
3. **Settings & team** — org settings editing (tabbed), user profile/address/payout methods, organizer role changes + spending controls — and this **fixes a live bug**: mobile's member-removal call hits a v4 route that doesn't exist today.

**Later waves outlined** — money-in depth, personal home, org resources, advanced card grants, G Suite/payroll, 2FA, search, etc.

Notable call-outs baked in: PayPal is server-disabled (ship endpoint, hide in UI); Wise makes synchronous external calls on quote and create; encrypted account fields only round-trip masked; 2FA/phone/email deferred to "manage on web." Verification covers Rails request specs + manual token hits and mobile `tsc`/lint + end-to-end flow driving.

---

## 🤖 Claude

`[tool: ToolSearch]`

---

## 🤖 Claude

`[tool: ExitPlanMode]`

---

## 👤 User

[Request interrupted by user]

---

## 👤 User

implement this

---

## 🤖 Claude

The plan is approved. This is a large Wave 1 with five sequenced steps across both codebases. Let me set up task tracking and start grounding myself in the actual files before editing.

---

## 🤖 Claude

`[tool: ToolSearch]`

---

## 🤖 Claude

`[tool: TaskCreate]`

---

## 🤖 Claude

`[tool: TaskCreate]`

---

## 🤖 Claude

`[tool: TaskCreate]`

---

## 🤖 Claude

`[tool: TaskCreate]`

---

## 🤖 Claude

`[tool: TaskCreate]`

---

## 🤖 Claude

`[tool: TaskCreate]`

---

## 🤖 Claude

`[tool: TaskCreate]`

---

## 🤖 Claude

`[tool: TaskCreate]`

---

## 🤖 Claude

`[tool: TaskCreate]`

---

## 🤖 Claude

Task list is set. Let me start Task 1 (shared form primitives) by reading the source patterns the plan says to extract from.

---

## 🤖 Claude

`[tool: TaskUpdate]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb-mobile/app/(app)/(events)/[id]/invite.tsx]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb-mobile/app/(app)/settings/index.tsx]`

---

## 🤖 Claude

Now I understand the form patterns. Let me check the theme helpers and core primitives before building the shared components.

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb-mobile/styles/theme.ts]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb-mobile/components/Button.tsx]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb-mobile/components/Text.tsx]`

---

## 🤖 Claude

I have a solid grasp of the design system. Now let me build the shared form primitives in `components/form/`.

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb-mobile/components/form/FieldLabel.tsx]`

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb-mobile/components/form/TextField.tsx]`

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb-mobile/components/form/CurrencyInput.tsx]`

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb-mobile/components/form/ToggleRow.tsx]`

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb-mobile/components/form/SelectRow.tsx]`

---

## 🤖 Claude

Now the `SettingsGroup`/`SettingsRow` card + chevron rows, plus a barrel export:

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb-mobile/components/form/SettingsGroup.tsx]`

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb-mobile/components/form/index.ts]`

---

## 🤖 Claude

Task 1 (form primitives) is done. Let me mark it complete and start Task 2 (Rails organizer-positions — the bug fix). First I need to ground myself in the actual Rails files.

---

## 🤖 Claude

`[tool: TaskUpdate]`

---

## 🤖 Claude

`[tool: TaskUpdate]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/config/routes.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/controllers/api/v4/application_controller.rb]`

---

## 🤖 Claude

Now let me read the templates and the web controllers I'll port for organizer positions + spending.

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/controllers/api/v4/ach_transfers_controller.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/helpers/api/v4/application_helper.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/controllers/organizer_positions_controller.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/policies/organizer_position_policy.rb]`

---

## 🤖 Claude

Let me read the `ChangePositionRole` concern, the spending controllers, and the relevant models/policies.

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/controllers/concerns/change_position_role.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/controllers/organizer_position/spending/controls_controller.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/controllers/organizer_position/spending/control/allowances_controller.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/controllers/concerns/set_event.rb]`

---

## 🤖 Claude

Now let me read the models and an existing user jbuilder partial to model the serialization.

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/models/organizer_position/spending/control.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/models/organizer_position/spending/control/allowance.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/views/api/v4/users/_user.json.jbuilder]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/controllers/api/v4/events_controller.rb]`

---

## 🤖 Claude

Let me check the OrganizerPosition model (roles, public_id, associations) and the spending policies.

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/models/organizer_position.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/policies/organizer_position/spending/control_policy.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/policies/organizer_position/spending/control/allowance_policy.rb]`

---

## 🤖 Claude

Let me check the role enum and whether OrganizerPosition has a public_id.

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/models/organizer_position/has_role.rb]`

---

## 🤖 Claude

`[tool: Bash → cd /Users/ibrahimmortada/hcb && grep -rn "PublicIdentifiable\|has_public_id\|public_id" app/models/organizer_position.rb]`

---

## 🤖 Claude

`[tool: Bash → cd /Users/ibrahimmortada/hcb && find app -path "*organizer_position*has_role*" -o -path "*organizer_position*has_spendin]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/models/concerns/organizer_position/has_role.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/models/concerns/organizer_position/has_spending.rb]`

---

## 🤖 Claude

OrganizerPosition uses numeric `id` (no public_id), roles are reader/member/manager. Let me check how existing v4 org-nested index actions authorize collections, so I match the pattern.

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/controllers/api/v4/organizer_position_invites_controller.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/controllers/api/v4/invoices_controller.rb]`

---

## 🤖 Claude

`[tool: Bash → cd /Users/ibrahimmortada/hcb && echo "=== v4 invoices views ==="; ls app/views/api/v4/invoices/ 2>/dev/null; echo "=== _]`

---

## 🤖 Claude

The policies reference `record.user == user` and `OrganizerPosition.role_at_least?(user, ...)`, but `pundit_user` is an `ApiAdminContext`. I must verify how `ApplicationPolicy` unwraps the user, or these checks break. Let me read both.

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/models/api_admin_context.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/app/policies/application_policy.rb]`

---

## 🤖 Claude

`ApiAdminContext` delegates to the user and makes `==`/`is_a?` work both ways, so the existing web policy methods (`destroy?`, `change_position_role?`, `view_allowances?`, Control/Allowance `create?`) work directly under v4 — exactly as the invites controller already relies on. No new policy methods needed. Now let me write the Rails files. First, the routes:

---

## 🤖 Claude

`[tool: Edit → /Users/ibrahimmortada/hcb/config/routes.rb]`

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/config/routes.rb]`

---

## 🤖 Claude

`[tool: Edit → /Users/ibrahimmortada/hcb/config/routes.rb]`

---

## 🤖 Claude

Now the controllers:

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb/app/controllers/api/v4/organizer_positions_controller.rb]`

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb/app/controllers/api/v4/spending_controls_controller.rb]`

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb/app/controllers/api/v4/allowances_controller.rb]`

---

## 🤖 Claude

Now the Jbuilder views. OrganizerPosition has no `public_id`, so I use a custom partial:

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb/app/views/api/v4/organizer_positions/_organizer_position.json.jbuilder]`

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb/app/views/api/v4/organizer_positions/index.json.jbuilder]`

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb/app/views/api/v4/organizer_positions/show.json.jbuilder]`

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb/app/views/api/v4/spending_controls/_spending_control.json.jbuilder]`

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb/app/views/api/v4/spending_controls/_allowance.json.jbuilder]`

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb/app/views/api/v4/spending_controls/show.json.jbuilder]`

---

## 🤖 Claude

Let me verify the Ruby syntax of the new files and that routes load.

---

## 🤖 Claude

`[tool: Bash → for f in app/controllers/api/v4/organizer_positions_controller.rb app/controllers/api/v4/spending_controls_controller.rb]`

---

## 🤖 Claude

`[tool: Bash → timeout 180 bin/rails routes 2>/dev/null | grep -iE "team|spending_control|allowance" | head -40]`

---

## 🤖 Claude

`[tool: Bash → timeout 200 bin/rails routes > /tmp/hcb_routes.txt 2>/tmp/hcb_routes_err.txt; echo "exit: $?"; echo "=== stderr (head) =]`

---

## 🤖 Claude

macOS lacks `timeout`. Let me run directly:

---

## 🤖 Claude

`[tool: Bash → bin/rails routes > /tmp/hcb_routes.txt 2>/tmp/hcb_routes_err.txt; echo "exit: $?"; echo "=== stderr head ==="; head -15 ]`

---

## 🤖 Claude

Routes are correctly registered with `:event_id`. Let me look at an existing v4 request spec to match the test pattern, then write specs for the new endpoints.

---

## 🤖 Claude

`[tool: Bash → ls spec/requests/api/v4/ 2>/dev/null; echo "=== factories for org position / control ==="; ls spec/factories/ | grep -iE]`

---

## 🤖 Claude

`[tool: Bash → echo "=== any v4 specs ==="; find spec -path "*v4*" -o -path "*api*v4*" 2>/dev/null | head; echo "=== request specs dir ]`

---

## 🤖 Claude

The v4 tests live under `spec/controllers/api/v4/`. Let me read an existing one to match the exact auth/setup pattern.

---

## 🤖 Claude

`[tool: Read → /Users/ibrahimmortada/hcb/spec/controllers/api/v4/events_controller_spec.rb]`

---

## 🤖 Claude

The v4 tests are controller specs with `render_views`. Let me write a spec for the new endpoints.

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb/spec/controllers/api/v4/organizer_positions_controller_spec.rb]`

---

## 🤖 Claude

Let me remove the awkward spending placeholder and write dedicated specs for the spending controllers:

---

## 🤖 Claude

`[tool: Edit → /Users/ibrahimmortada/hcb/spec/controllers/api/v4/organizer_positions_controller_spec.rb]`

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb/spec/controllers/api/v4/spending_controls_controller_spec.rb]`

---

## 🤖 Claude

`[tool: Write → /Users/ibrahimmortada/hcb/spec/controllers/api/v4/allowances_controller_spec.rb]`

---

## 🤖 Claude

Now let me run these specs to verify the endpoints work end-to-end.

---

## 🤖 Claude

`[tool: Bash → bundle exec rspec spec/controllers/api/v4/organizer_positions_controller_spec.rb spec/controllers/api/v4/spending_contro]`

---

## 🤖 Claude

The route param is `:event_id` (from `resources :events, path: "organizations"`), not `:organization_id`. In real HTTP requests the path maps correctly, but controller specs need the actual param key. Let me fix the specs:

---

## 🤖 Claude

`[tool: Bash → sed -i '' 's/organization_id: event.friendly_id/event_id: event.friendly_id/g' spec/controllers/api/v4/organizer_positio]`

---

## 🤖 Claude

`[tool: Bash → bundle exec rspec spec/controllers/api/v4/organizer_positions_controller_spec.rb spec/controllers/api/v4/spending_contro]`

---

## 👤 User

[Request interrupted by user]

---
