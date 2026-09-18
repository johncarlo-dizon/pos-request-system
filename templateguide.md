# Building the Google Doc Template

`DocService.gs` opens a copy of one Google Doc and does `body.replaceText('{{tag}}', value)`
for each tag below. The template needs to **look exactly like your original
`BUSINESS CASE_ ADDITIONAL POS UNIT REQUEST TEMPLATE.docx`**, except every `INPUT` /
`INPUT NR` / checkbox / blank is replaced with the matching `{{tag}}`.

## How to set it up

1. Open your original template `.docx` in Google Drive → "Open with Google Docs"
   (this converts it to a native Google Doc, which `DocumentApp` needs).
2. Replace each field below with the exact `{{tag}}` text shown (curly braces included).
   Keep all the surrounding formatting, bold, tables, etc. exactly as-is — only the
   placeholder text changes.
3. Copy the resulting Doc's ID from its URL
   (`docs.google.com/document/d/`**`THIS_PART`**`/edit`).
4. Put that ID into the `TEMPLATE_DOC_ID` Script Property (see SETUP_README.md).

## Tag map, section by section

**Header**
| Original | Replace with |
|---|---|
| `Document Ref: ________` | `Document Ref: {{doc_ref}}` |

**1. Request Information**
| Original | Replace with |
|---|---|
| Store Code / Store Name blank | `{{store_code}}` |
| Request Date blank | `{{request_date}}` |
| Target Go-Live Date blank | `{{target_golive_date}}` |
| Requested By blank | `{{requested_by}}` |

**2. Impact & Metrics**
| Original | Replace with |
|---|---|
| Peak Hour Hourly Transactions | `{{peak_hour_transactions}}` |
| Target Hourly Capacity | `{{target_hourly_capacity}}` |
| Average Queue Time | `{{avg_queue_time}}` |
| Expected Queue Time | `{{expected_queue_time}}` |
| Estimated Monthly Store Revenue | `{{est_monthly_revenue}}` |
| Projected Monthly Revenue Increase | `{{projected_revenue_increase}}` |
| Alternative Solutions Evaluated blank | `{{alternative_solutions}}` |

**3. Site Readiness & Asset Preference**
Replace each `[ ]` checkbox with just the mark tag (keep "(Yes / No)" text as-is):
| Original | Replace with |
|---|---|
| `[ ]` before "Counter space…" | `[{{counter_space_mark}}]` |
| `[ ]` before "Dedicated AC power…" | `[{{ac_power_mark}}]` |
| `[ ]` before "Active network LAN…" | `[{{lan_port_mark}}]` |

**4. Financial & Budget Allocation** — leave completely blank, no tags (filled on hard copy).

**5. Approval & Governance Gate**

Area Manager row:
| Column | Replace with |
|---|---|
| Name | `{{am_name}}` |
| Recommendation / Decision | leave as fixed text: `Submitted Request` |
| Signature & Date | `_____ / {{am_date}}` *(leave the signature blank, only merge the date)* |

For **each** of the other 5 rows (BM / DBM Manager, Category, IT, BA, FAS, Accounting),
use that row's key from this table:

| Row | key |
|---|---|
| BM / DBM Manager | `bm` |
| Category | `category` |
| IT | `it` |
| BA | `ba` |
| FAS | `fas` |
| Accounting | `accounting` |

And for each row:
| Column | Replace with |
|---|---|
| Name | `{{<key>_name}}` |
| `[ ] Approved [ ] Rejected` | `[{{<key>_approved_mark}}] Approved [{{<key>_rejected_mark}}] Rejected` |
| Signature & Date | `_____ / {{<key>_date}}` |

Example for the BM / DBM Manager row:
- Name → `{{bm_name}}`
- Decision → `[{{bm_approved_mark}}] Approved [{{bm_rejected_mark}}] Rejected`
- Signature & Date → `_____ / {{bm_date}}`

(The IT / BA / FAS rows keep their extra qualifier text, e.g.
`[{{it_approved_mark}}] Approved (Technical & Infra Ready) [{{it_rejected_mark}}] Rejected` —
just keep the original wording and only swap in the two mark tags.)

## Notes
- `{{am_date}}`, `{{bm_date}}`, etc. are inserted as `DD / MM / YYYY` strings already, so
  just place the single tag where the date should go — don't split it across two blanks.
- Signatures are **never** merged — they stay blank for the printed hard copy.
- Section 4 has no tags at all — it's intentionally left blank.
