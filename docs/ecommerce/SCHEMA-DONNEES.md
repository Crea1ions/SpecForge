# Schéma de données PostgreSQL — template e-commerce Odoo

Document généré depuis le code source Odoo (extraction statique, sans base de données). 47 modèles du périmètre e-commerce, dans l'ordre alphabétique.

**Lecture** : chaque section décrit une table. Les colonnes `id`, `create_uid`, `create_date`, `write_uid`, `write_date` sont ajoutées par l'ORM. `ON DELETE … (défaut ORM)` signifie que le code ne le déclare pas et que l'ORM applique sa règle par défaut. Les champs JSON stockent soit une valeur par langue, soit une valeur par société, soit des données structurées. Une table de relation apparaît dans la section de chaque modèle qui la déclare, avec ses deux colonnes dans l'ordre de ce modèle.

## account.fiscal.position — table `account_fiscal_position`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `sequence` | integer |  |  |
| `name` | jsonb | NOT NULL | JSON : une valeur par langue |
| `active` | boolean |  |  |
| `company_id` | integer | NOT NULL, indexé, FK → `res_company`, ON DELETE RESTRICT (défaut ORM) |  |
| `note` | jsonb |  | JSON : une valeur par langue |
| `auto_apply` | boolean |  |  |
| `vat_required` | boolean |  |  |
| `country_id` | integer | FK → `res_country`, ON DELETE SET NULL (défaut ORM) |  |
| `is_domestic` | boolean |  |  |
| `country_group_id` | integer | FK → `res_country_group`, ON DELETE SET NULL (défaut ORM) |  |
| `zip_from` | varchar |  |  |
| `zip_to` | varchar |  |  |
| `foreign_vat` | varchar |  |  |

**Table de relation** `account_fiscal_position_account_tax_rel` (champ `tax_ids`) : `account_fiscal_position_id` → `account_fiscal_position`, `account_tax_id` → `account_tax`.

**Table de relation** `account_fiscal_position_res_country_state_rel` (champ `state_ids`) : `account_fiscal_position_id` → `account_fiscal_position`, `res_country_state_id` → `res_country_state`.

## account.move — table `account_move`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | varchar | indexé |  |
| `ref` | varchar | indexé |  |
| `date` | date | NOT NULL, indexé |  |
| `state` | varchar | NOT NULL |  |
| `move_type` | varchar | NOT NULL, indexé |  |
| `journal_id` | integer | NOT NULL, FK → `account_journal`, ON DELETE RESTRICT (défaut ORM) |  |
| `company_id` | integer | indexé, FK → `res_company`, ON DELETE SET NULL (défaut ORM) |  |
| `origin_payment_id` | integer | indexé, FK → `account_payment`, ON DELETE SET NULL (défaut ORM) |  |
| `statement_line_id` | integer | indexé, FK → `account_bank_statement_line`, ON DELETE SET NULL (défaut ORM) |  |
| `tax_cash_basis_rec_id` | integer | indexé, FK → `account_partial_reconcile`, ON DELETE SET NULL (défaut ORM) |  |
| `tax_cash_basis_origin_move_id` | integer | indexé, FK → `account_move`, ON DELETE SET NULL (défaut ORM) |  |
| `always_tax_exigible` | boolean |  |  |
| `auto_post` | varchar | NOT NULL |  |
| `auto_post_until` | date |  |  |
| `auto_post_origin_id` | integer | indexé, FK → `account_move`, ON DELETE SET NULL (défaut ORM) |  |
| `checked` | boolean |  |  |
| `posted_before` | boolean |  |  |
| `made_sequence_gap` | boolean |  |  |
| `secure_sequence_number` | integer | indexé |  |
| `inalterable_hash` | varchar | indexé |  |
| `invoice_date` | date | indexé |  |
| `invoice_date_due` | date | indexé |  |
| `delivery_date` | date |  |  |
| `taxable_supply_date` | date |  |  |
| `invoice_payment_term_id` | integer | FK → `account_payment_term`, ON DELETE SET NULL (défaut ORM) |  |
| `partner_id` | integer | indexé, FK → `res_partner`, ON DELETE RESTRICT |  |
| `commercial_partner_id` | integer | FK → `res_partner`, ON DELETE RESTRICT |  |
| `partner_shipping_id` | integer | FK → `res_partner`, ON DELETE SET NULL (défaut ORM) |  |
| `partner_bank_id` | integer | indexé, FK → `res_partner_bank`, ON DELETE RESTRICT |  |
| `fiscal_position_id` | integer | FK → `account_fiscal_position`, ON DELETE RESTRICT |  |
| `payment_reference` | varchar | indexé |  |
| `qr_code_method` | varchar |  |  |
| `preferred_payment_method_line_id` | integer | FK → `account_payment_method_line`, ON DELETE SET NULL (défaut ORM) |  |
| `currency_id` | integer | NOT NULL, FK → `res_currency`, ON DELETE RESTRICT (défaut ORM) |  |
| `invoice_currency_rate` | numeric |  |  |
| `amount_untaxed` | numeric |  |  |
| `amount_tax` | numeric |  |  |
| `amount_total` | numeric |  |  |
| `amount_residual` | numeric |  |  |
| `amount_untaxed_signed` | numeric |  |  |
| `amount_untaxed_in_currency_signed` | numeric |  |  |
| `amount_tax_signed` | numeric |  |  |
| `amount_total_signed` | numeric |  |  |
| `amount_total_in_currency_signed` | numeric |  |  |
| `amount_residual_signed` | numeric |  |  |
| `payment_state` | varchar |  |  |
| `reversed_entry_id` | integer | indexé, FK → `account_move`, ON DELETE SET NULL (défaut ORM) |  |
| `invoice_source_email` | varchar |  |  |
| `invoice_partner_display_name` | varchar |  |  |
| `is_manually_modified` | boolean |  |  |
| `quick_edit_total_amount` | numeric |  |  |
| `narration` | text |  |  |
| `is_move_sent` | boolean |  |  |
| `invoice_user_id` | integer | FK → `res_users`, ON DELETE SET NULL (défaut ORM) |  |
| `invoice_origin` | varchar |  |  |
| `invoice_incoterm_id` | integer | FK → `account_incoterms`, ON DELETE SET NULL (défaut ORM) |  |
| `incoterm_location` | varchar |  |  |
| `invoice_cash_rounding_id` | integer | FK → `account_cash_rounding`, ON DELETE SET NULL (défaut ORM) |  |
| `sending_data` | jsonb |  | JSON natif (données structurées) |
| `team_id` | integer | FK → `crm_team`, ON DELETE SET NULL |  |
| `campaign_id` | integer | FK → `utm_campaign`, ON DELETE SET NULL |  |
| `medium_id` | integer | FK → `utm_medium`, ON DELETE SET NULL |  |
| `source_id` | integer | FK → `utm_source`, ON DELETE SET NULL |  |
| `website_id` | integer | FK → `website`, ON DELETE SET NULL (défaut ORM) |  |

**Table de relation** `account_move__account_payment` (champ `matched_payment_ids`) : `invoice_id` → `account_move`, `payment_id` → `account_payment`.

**Table de relation** `adjusting_entries__account_move` (champ `adjusting_entry_origin_move_ids`) : `move_id` → `account_move`, `adjusting_entry_move_id` → `account_move`.

**Table de relation** `adjusting_entries__account_move` (champ `adjusting_entries_move_ids`) : `adjusting_entry_move_id` → `account_move`, `move_id` → `account_move`.

**Table de relation** `account_invoice_transaction_rel` (champ `transaction_ids`) : `invoice_id` → `account_move`, `transaction_id` → `payment_transaction`.

**Index** (nom déclaré dans le code)
- `checked_idx` : `(journal_id) WHERE (checked IS NOT TRUE)`
- `payment_idx` : `(journal_id, state, payment_state, move_type, date)`
- `unique_name` : `(name, journal_id) WHERE (state = 'posted'AND name != '/')`
- `journal_id_date_idx` : `(journal_id, date)`
- `journal_id_company_id_idx` : `(journal_id, company_id, date)`
- `made_gaps` : `(journal_id, state, payment_state, move_type, date) WHERE (made_sequence_gap IS TRUE)`
- `duplicate_bills_idx` : `(ref) WHERE (move_type IN ('in_invoice', 'in_refund'))`
- `account_move_sanitize_payment_ref_idx` : `(regexp_replace(COALESCE(payment_reference, ref, ''), '[^a-zA-Z0-9]', '', 'g'))`

## account.move.reversal — table `account_move_reversal`

*Type : modèle transitoire (assistant).*

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `date` | date |  |  |
| `reason` | varchar |  |  |
| `journal_id` | integer | NOT NULL, FK → `account_journal`, ON DELETE CASCADE (défaut ORM) |  |
| `company_id` | integer | NOT NULL, FK → `res_company`, ON DELETE CASCADE (défaut ORM) |  |

**Table de relation** `account_move_reversal_move` (champ `move_ids`) : `reversal_id` → `account_move_reversal`, `move_id` → `account_move`.

**Table de relation** `account_move_reversal_new_move` (champ `new_move_ids`) : `reversal_id` → `account_move_reversal`, `new_move_id` → `account_move`.

## account.tax — table `account_tax`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | jsonb | NOT NULL | JSON : une valeur par langue |
| `type_tax_use` | varchar | NOT NULL |  |
| `tax_scope` | varchar |  |  |
| `amount_type` | varchar | NOT NULL |  |
| `is_domestic` | boolean |  |  |
| `active` | boolean |  |  |
| `company_id` | integer | NOT NULL, FK → `res_company`, ON DELETE RESTRICT (défaut ORM) |  |
| `sequence` | integer | NOT NULL |  |
| `amount` | numeric | NOT NULL |  |
| `description` | jsonb |  | JSON : une valeur par langue |
| `invoice_label` | jsonb |  | JSON : une valeur par langue |
| `price_include_override` | varchar |  |  |
| `include_base_amount` | boolean |  |  |
| `is_base_affected` | boolean |  |  |
| `analytic` | boolean |  |  |
| `tax_group_id` | integer | NOT NULL, FK → `account_tax_group`, ON DELETE RESTRICT (défaut ORM) |  |
| `tax_exigibility` | varchar |  |  |
| `cash_basis_transition_account_id` | integer | FK → `account_account`, ON DELETE SET NULL (défaut ORM) |  |
| `country_id` | integer | NOT NULL, FK → `res_country`, ON DELETE RESTRICT (défaut ORM) |  |
| `invoice_legal_notes` | jsonb |  | JSON : une valeur par langue |

**Table de relation** `account_fiscal_position_account_tax_rel` (champ `fiscal_position_ids`) : `account_tax_id` → `account_tax`, `account_fiscal_position_id` → `account_fiscal_position`.

**Table de relation** `account_tax_alternatives` (champ `original_tax_ids`) : `dest_tax_id` → `account_tax`, `src_tax_id` → `account_tax`.

**Table de relation** `account_tax_alternatives` (champ `replacing_tax_ids`) : `src_tax_id` → `account_tax`, `dest_tax_id` → `account_tax`.

**Table de relation** `account_tax_filiation_rel` (champ `children_tax_ids`) : `parent_tax` → `account_tax`, `child_tax` → `account_tax`.

**Table de relation** `account_move_line_account_tax_rel` (champ `account_move_line_ids`) : `account_tax_id` → `account_tax`, `account_move_line_id` → `account_move_line`.

**Table de relation** `account_reconcile_model_line_account_tax_rel` (champ `account_reconcile_model_line_ids`) : `account_tax_id` → `account_tax`, `account_reconcile_model_line_id` → `account_reconcile_model_line`.

## delivery.carrier — table `delivery_carrier`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | jsonb | NOT NULL | JSON : une valeur par langue |
| `active` | boolean |  |  |
| `sequence` | integer |  |  |
| `delivery_type` | varchar | NOT NULL |  |
| `allow_cash_on_delivery` | boolean |  |  |
| `integration_level` | varchar |  |  |
| `prod_environment` | boolean |  |  |
| `debug_logging` | boolean |  |  |
| `company_id` | integer | FK → `res_company`, ON DELETE SET NULL (défaut ORM) |  |
| `product_id` | integer | NOT NULL, FK → `product_product`, ON DELETE RESTRICT |  |
| `tracking_url` | varchar |  |  |
| `invoice_policy` | varchar | NOT NULL |  |
| `max_weight` | double precision |  |  |
| `max_volume` | double precision |  |  |
| `carrier_description` | jsonb |  | JSON : une valeur par langue |
| `margin` | double precision |  |  |
| `fixed_margin` | double precision |  |  |
| `free_over` | boolean |  |  |
| `amount` | double precision |  |  |
| `return_label_on_delivery` | boolean |  |  |
| `get_return_label_from_portal` | boolean |  |  |
| `shipping_insurance` | integer |  |  |
| `fixed_price` | double precision |  |  |
| `mondialrelay_brand` | varchar |  |  |
| `mondialrelay_packagetype` | varchar |  |  |
| `gelato_shipping_service_type` | varchar | NOT NULL |  |

**Table de relation** `delivery_carrier_country_rel` (champ `country_ids`) : `carrier_id` → `delivery_carrier`, `country_id` → `res_country`.

**Table de relation** `delivery_carrier_state_rel` (champ `state_ids`) : `carrier_id` → `delivery_carrier`, `state_id` → `res_country_state`.

**Table de relation** `delivery_zip_prefix_rel` (champ `zip_prefix_ids`) : `carrier_id` → `delivery_carrier`, `zip_prefix_id` → `delivery_zip_prefix`.

**Table de relation** `product_tag_delivery_carrier_must_have_rel` (champ `must_have_tag_ids`) : `delivery_carrier_id` → `delivery_carrier`, `product_tag_id` → `product_tag`.

**Table de relation** `product_tag_delivery_carrier_excluded_rel` (champ `excluded_tag_ids`) : `delivery_carrier_id` → `delivery_carrier`, `product_tag_id` → `product_tag`.

**Table de relation** `stock_route_shipping` (champ `route_ids`) : `shipping_id` → `delivery_carrier`, `route_id` → `stock_route`.

**Table de relation** `delivery_carrier_stock_warehouse_rel` (champ `warehouse_ids`) : `delivery_carrier_id` → `delivery_carrier`, `stock_warehouse_id` → `stock_warehouse`.

**Contraintes**
- `margin_not_under_100_percent` : `CHECK (margin >= -1)`
- `shipping_insurance_is_percentage` : `CHECK(shipping_insurance >= 0 AND shipping_insurance <= 100)`

## delivery.price.rule — table `delivery_price_rule`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `sequence` | integer | NOT NULL |  |
| `carrier_id` | integer | NOT NULL, indexé, FK → `delivery_carrier`, ON DELETE CASCADE |  |
| `variable` | varchar | NOT NULL |  |
| `operator` | varchar | NOT NULL |  |
| `max_value` | double precision | NOT NULL |  |
| `list_base_price` | double precision | NOT NULL |  |
| `list_price` | double precision | NOT NULL |  |
| `variable_factor` | varchar | NOT NULL |  |

## ir.logging — table `ir_logging`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | varchar | NOT NULL |  |
| `type` | varchar | NOT NULL, indexé |  |
| `dbname` | varchar | indexé |  |
| `level` | varchar | indexé |  |
| `message` | text | NOT NULL |  |
| `path` | varchar | NOT NULL |  |
| `func` | varchar | NOT NULL |  |
| `line` | varchar | NOT NULL |  |

## ir.rule — table `ir_rule`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | varchar |  |  |
| `active` | boolean |  |  |
| `model_id` | integer | NOT NULL, indexé, FK → `ir_model`, ON DELETE CASCADE |  |
| `domain_force` | text |  |  |
| `perm_read` | boolean |  |  |
| `perm_write` | boolean |  |  |
| `perm_create` | boolean |  |  |
| `perm_unlink` | boolean |  |  |

**Table de relation** `rule_group_rel` (champ `groups`) : `rule_group_id` → `ir_rule`, `group_id` → `res_groups`.

**Contraintes**
- `no_access_rights` : `CHECK (perm_read!=False or perm_write!=False or perm_create!=False or perm_unlink!=False)`

## ir.ui.view — table `ir_ui_view`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | varchar | NOT NULL |  |
| `model` | varchar | indexé |  |
| `key` | varchar | indexé |  |
| `priority` | integer | NOT NULL |  |
| `type` | varchar |  |  |
| `arch_db` | jsonb |  | JSON : une valeur par langue |
| `arch_fs` | varchar |  |  |
| `arch_updated` | boolean |  |  |
| `arch_prev` | text |  |  |
| `inherit_id` | integer | indexé, FK → `ir_ui_view`, ON DELETE RESTRICT |  |
| `mode` | varchar | NOT NULL |  |
| `active` | boolean |  |  |
| `customize_show` | boolean |  |  |
| `website_id` | integer | FK → `website`, ON DELETE CASCADE |  |
| `track` | boolean |  |  |
| `visibility` | varchar |  |  |
| `visibility_password` | varchar |  |  |
| `theme_template_id` | integer | indexé, FK → `theme_ir_ui_view`, ON DELETE SET NULL (défaut ORM) |  |

**Table de relation** `ir_ui_view_group_rel` (champ `group_ids`) : `view_id` → `ir_ui_view`, `group_id` → `res_groups`.

**Contraintes**
- `inheritance_mode` : `CHECK (mode != 'extension' OR inherit_id IS NOT NULL)`
- `qweb_required_key` : `CHECK (type != 'qweb' OR key IS NOT NULL)`

**Index** (nom déclaré dans le code)
- `model_type_inherit_id` : `(model, inherit_id)`

## loyalty.card — table `loyalty_card`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `program_id` | integer | indexé, FK → `loyalty_program`, ON DELETE RESTRICT |  |
| `company_id` | integer | FK → `res_company`, ON DELETE SET NULL (défaut ORM) |  |
| `partner_id` | integer | indexé, FK → `res_partner`, ON DELETE SET NULL (défaut ORM) |  |
| `points` | double precision |  |  |
| `code` | varchar | NOT NULL |  |
| `expiration_date` | date |  |  |
| `active` | boolean |  |  |
| `order_id` | integer | FK → `sale_order`, ON DELETE SET NULL (défaut ORM) |  |

**Contraintes**
- `card_code_unique` : `UNIQUE(code)`

## loyalty.program — table `loyalty_program`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | jsonb | NOT NULL | JSON : une valeur par langue |
| `active` | boolean |  |  |
| `sequence` | integer |  |  |
| `company_id` | integer | FK → `res_company`, ON DELETE SET NULL (défaut ORM) |  |
| `currency_id` | integer | NOT NULL, FK → `res_currency`, ON DELETE RESTRICT (défaut ORM) |  |
| `program_type` | varchar | NOT NULL |  |
| `date_from` | date |  |  |
| `date_to` | date |  |  |
| `limit_usage` | boolean |  |  |
| `max_usage` | integer |  |  |
| `applies_on` | varchar | NOT NULL |  |
| `trigger` | varchar |  |  |
| `portal_visible` | boolean |  |  |
| `portal_point_name` | jsonb |  | JSON : une valeur par langue |
| `sale_ok` | boolean |  |  |
| `ecommerce_ok` | boolean |  |  |

**Table de relation** `loyalty_program_product_pricelist_rel` (champ `pricelist_ids`) : `loyalty_program_id` → `loyalty_program`, `product_pricelist_id` → `product_pricelist`.

**Contraintes**
- `check_max_usage` : `CHECK (limit_usage = False OR max_usage > 0)`

## loyalty.reward — table `loyalty_reward`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `active` | boolean |  |  |
| `program_id` | integer | NOT NULL, indexé, FK → `loyalty_program`, ON DELETE CASCADE |  |
| `company_id` | integer | FK → `res_company`, ON DELETE SET NULL (défaut ORM) |  |
| `description` | jsonb | NOT NULL | JSON : une valeur par langue |
| `reward_type` | varchar | NOT NULL |  |
| `discount` | double precision |  |  |
| `discount_mode` | varchar | NOT NULL |  |
| `discount_applicability` | varchar |  |  |
| `discount_product_domain` | varchar |  |  |
| `discount_product_category_id` | integer | FK → `product_category`, ON DELETE SET NULL (défaut ORM) |  |
| `discount_product_tag_id` | integer | FK → `product_tag`, ON DELETE SET NULL (défaut ORM) |  |
| `discount_max_amount` | numeric |  |  |
| `discount_line_product_id` | integer | FK → `product_product`, ON DELETE RESTRICT |  |
| `reward_product_id` | integer | FK → `product_product`, ON DELETE SET NULL (défaut ORM) |  |
| `reward_product_tag_id` | integer | FK → `product_tag`, ON DELETE SET NULL (défaut ORM) |  |
| `reward_product_qty` | integer |  |  |
| `required_points` | double precision |  |  |
| `clear_wallet` | boolean |  |  |

**Table de relation** `loyalty_reward_product_product_rel` (champ `discount_product_ids`) : `loyalty_reward_id` → `loyalty_reward`, `product_product_id` → `product_product`.

**Contraintes**
- `required_points_positive` : `CHECK (required_points > 0)`
- `product_qty_positive` : `CHECK (reward_type != 'product' OR reward_product_qty > 0)`
- `discount_positive` : `CHECK (reward_type != 'discount' OR discount > 0)`

## loyalty.rule — table `loyalty_rule`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `active` | boolean |  |  |
| `program_id` | integer | NOT NULL, indexé, FK → `loyalty_program`, ON DELETE CASCADE |  |
| `company_id` | integer | FK → `res_company`, ON DELETE SET NULL (défaut ORM) |  |
| `product_domain` | varchar |  |  |
| `product_category_id` | integer | FK → `product_category`, ON DELETE SET NULL (défaut ORM) |  |
| `product_tag_id` | integer | FK → `product_tag`, ON DELETE SET NULL (défaut ORM) |  |
| `reward_point_amount` | double precision |  |  |
| `reward_point_split` | boolean |  |  |
| `reward_point_mode` | varchar | NOT NULL |  |
| `minimum_qty` | integer |  |  |
| `minimum_amount` | numeric |  |  |
| `minimum_amount_tax_mode` | varchar | NOT NULL |  |
| `mode` | varchar |  |  |
| `code` | varchar |  |  |
| `website_id` | integer | FK → `website`, ON DELETE SET NULL (défaut ORM) |  |

**Table de relation** `loyalty_rule_product_product_rel` (champ `product_ids`) : `loyalty_rule_id` → `loyalty_rule`, `product_product_id` → `product_product`.

**Contraintes**
- `reward_point_amount_positive` : `CHECK (reward_point_amount > 0)`

## mail.compose.message — table `mail_compose_message`

*Type : modèle transitoire (assistant).*

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `subject` | varchar |  |  |
| `body` | text |  |  |
| `parent_id` | integer | FK → `mail_message`, ON DELETE SET NULL |  |
| `template_id` | integer | FK → `mail_template`, ON DELETE SET NULL (défaut ORM) |  |
| `email_layout_xmlid` | varchar |  |  |
| `email_add_signature` | boolean |  |  |
| `email_from` | varchar |  |  |
| `author_id` | integer | FK → `res_partner`, ON DELETE SET NULL (défaut ORM) |  |
| `composition_mode` | varchar |  |  |
| `composition_comment_option` | varchar |  |  |
| `model` | varchar |  |  |
| `res_ids` | text |  |  |
| `res_domain` | text |  |  |
| `res_domain_user_id` | integer | FK → `res_users`, ON DELETE SET NULL (défaut ORM) |  |
| `record_alias_domain_id` | integer | FK → `mail_alias_domain`, ON DELETE SET NULL (défaut ORM) |  |
| `record_company_id` | integer | FK → `res_company`, ON DELETE SET NULL (défaut ORM) |  |
| `message_type` | varchar | NOT NULL |  |
| `subtype_id` | integer | FK → `mail_message_subtype`, ON DELETE SET NULL |  |
| `mail_activity_type_id` | integer | FK → `mail_activity_type`, ON DELETE SET NULL |  |
| `reply_to` | varchar |  |  |
| `reply_to_force_new` | boolean |  |  |
| `auto_delete` | boolean |  |  |
| `auto_delete_keep_log` | boolean |  |  |
| `force_send` | boolean |  |  |
| `mail_server_id` | integer | FK → `ir_mail_server`, ON DELETE SET NULL (défaut ORM) |  |
| `notify_author` | boolean |  |  |
| `notify_author_mention` | boolean |  |  |
| `notify_skip_followers` | boolean |  |  |
| `scheduled_date` | varchar |  |  |
| `use_exclusion_list` | boolean |  |  |
| `template_name` | varchar |  |  |

**Table de relation** `mail_compose_message_ir_attachments_rel` (champ `attachment_ids`) : `wizard_id` → `mail_compose_message`, `attachment_id` → `ir_attachment`.

**Table de relation** `mail_compose_message_res_partner_rel` (champ `partner_ids`) : `wizard_id` → `mail_compose_message`, `partner_id` → `res_partner`.

## mail.template — table `mail_template`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | jsonb |  | JSON : une valeur par langue |
| `description` | jsonb |  | JSON : une valeur par langue |
| `active` | boolean |  |  |
| `model_id` | integer | FK → `ir_model`, ON DELETE CASCADE |  |
| `model` | varchar | indexé |  |
| `subject` | jsonb |  | JSON : une valeur par langue |
| `email_from` | varchar |  |  |
| `user_id` | integer | FK → `res_users`, ON DELETE SET NULL (défaut ORM) |  |
| `use_default_to` | boolean |  |  |
| `email_to` | varchar |  |  |
| `partner_to` | varchar |  |  |
| `email_cc` | varchar |  |  |
| `reply_to` | varchar |  |  |
| `body_html` | jsonb |  | JSON : une valeur par langue |
| `email_layout_xmlid` | varchar |  |  |
| `mail_server_id` | integer | indexé, FK → `ir_mail_server`, ON DELETE SET NULL (défaut ORM) |  |
| `scheduled_date` | varchar |  |  |
| `auto_delete` | boolean |  |  |
| `ref_ir_act_window` | integer | FK → `ir_act_window`, ON DELETE SET NULL (défaut ORM) |  |

**Table de relation** `email_template_attachment_rel` (champ `attachment_ids`) : `email_template_id` → `mail_template`, `attachment_id` → `ir_attachment`.

**Table de relation** `mail_template_ir_actions_report_rel` (champ `report_template_ids`) : `mail_template_id` → `mail_template`, `ir_actions_report_id` → `ir_act_report_xml`.

## mail.thread — aucune table

*Type : modèle abstrait.*

Pas de table propre : ces champs sont copiés dans la table de chaque modèle qui hérite de celui-ci.

Aucun champ stocké déclaré.

## payment.method — table `payment_method`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | jsonb | NOT NULL | JSON : une valeur par langue |
| `code` | varchar | NOT NULL |  |
| `sequence` | integer |  |  |
| `primary_payment_method_id` | integer | indexé, FK → `payment_method`, ON DELETE SET NULL (défaut ORM) |  |
| `active` | boolean |  |  |
| `support_tokenization` | boolean |  |  |
| `support_express_checkout` | boolean |  |  |
| `support_manual_capture` | varchar | NOT NULL |  |
| `support_refund` | varchar | NOT NULL |  |

**Table de relation** `payment_method_payment_provider_rel` (champ `provider_ids`) : `payment_method_id` → `payment_method`, `payment_provider_id` → `payment_provider`.

**Table de relation** `payment_method_res_country_rel` (champ `supported_country_ids`) : `payment_method_id` → `payment_method`, `res_country_id` → `res_country`.

**Table de relation** `payment_method_res_currency_rel` (champ `supported_currency_ids`) : `payment_method_id` → `payment_method`, `res_currency_id` → `res_currency`.

## payment.provider — table `payment_provider`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | jsonb | NOT NULL | JSON : une valeur par langue |
| `sequence` | integer |  |  |
| `code` | varchar | NOT NULL |  |
| `state` | varchar | NOT NULL |  |
| `is_published` | boolean |  |  |
| `company_id` | integer | NOT NULL, indexé, FK → `res_company`, ON DELETE RESTRICT (défaut ORM) |  |
| `allow_tokenization` | boolean |  |  |
| `capture_manually` | boolean |  |  |
| `allow_express_checkout` | boolean |  |  |
| `redirect_form_view_id` | integer | FK → `ir_ui_view`, ON DELETE RESTRICT |  |
| `inline_form_view_id` | integer | FK → `ir_ui_view`, ON DELETE RESTRICT |  |
| `token_inline_form_view_id` | integer | FK → `ir_ui_view`, ON DELETE RESTRICT |  |
| `express_checkout_form_view_id` | integer | FK → `ir_ui_view`, ON DELETE RESTRICT |  |
| `maximum_amount` | numeric |  |  |
| `pre_msg` | jsonb |  | JSON : une valeur par langue |
| `pending_msg` | jsonb |  | JSON : une valeur par langue |
| `auth_msg` | jsonb |  | JSON : une valeur par langue |
| `done_msg` | jsonb |  | JSON : une valeur par langue |
| `cancel_msg` | jsonb |  | JSON : une valeur par langue |
| `color` | integer |  |  |
| `module_id` | integer | FK → `ir_module_module`, ON DELETE SET NULL (défaut ORM) |  |
| `custom_mode` | varchar |  |  |
| `qr_code` | boolean |  |  |
| `so_reference_type` | varchar |  |  |
| `ecpay_merchant_id` | varchar |  |  |
| `ecpay_hash_key` | varchar |  |  |
| `ecpay_hash_iv` | varchar |  |  |
| `payu_key_id` | varchar |  |  |
| `payu_merchant_salt` | varchar |  |  |
| `stripe_publishable_key` | varchar |  |  |
| `stripe_secret_key` | varchar |  |  |
| `stripe_webhook_secret` | varchar |  |  |
| `website_id` | integer | FK → `website`, ON DELETE RESTRICT |  |

**Table de relation** `payment_method_payment_provider_rel` (champ `payment_method_ids`) : `payment_provider_id` → `payment_provider`, `payment_method_id` → `payment_method`.

**Table de relation** `payment_country_rel` (champ `available_country_ids`) : `payment_id` → `payment_provider`, `country_id` → `res_country`.

**Table de relation** `payment_currency_rel` (champ `available_currency_ids`) : `payment_provider_id` → `payment_provider`, `currency_id` → `res_currency`.

**Contraintes**
- `custom_providers_setup` : `CHECK(custom_mode IS NULL OR (code = 'custom' AND custom_mode IS NOT NULL))`

## payment.refund.wizard — table `payment_refund_wizard`

*Type : modèle transitoire (assistant).*

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `payment_id` | integer | FK → `account_payment`, ON DELETE SET NULL (défaut ORM) |  |
| `amount_to_refund` | numeric |  |  |

## payment.transaction — table `payment_transaction`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `provider_id` | integer | NOT NULL, FK → `payment_provider`, ON DELETE RESTRICT (défaut ORM) |  |
| `company_id` | integer | indexé, FK → `res_company`, ON DELETE SET NULL (défaut ORM) |  |
| `payment_method_id` | integer | NOT NULL, FK → `payment_method`, ON DELETE RESTRICT (défaut ORM) |  |
| `reference` | varchar | NOT NULL |  |
| `provider_reference` | varchar |  |  |
| `amount` | numeric | NOT NULL |  |
| `currency_id` | integer | NOT NULL, FK → `res_currency`, ON DELETE RESTRICT (défaut ORM) |  |
| `token_id` | integer | indexé, FK → `payment_token`, ON DELETE RESTRICT |  |
| `state` | varchar | NOT NULL, indexé |  |
| `state_message` | text |  |  |
| `last_state_change` | timestamp |  |  |
| `operation` | varchar | indexé |  |
| `is_live` | boolean |  |  |
| `source_transaction_id` | integer | indexé, FK → `payment_transaction`, ON DELETE SET NULL (défaut ORM) |  |
| `is_post_processed` | boolean |  |  |
| `tokenize` | boolean |  |  |
| `landing_route` | varchar |  |  |
| `partner_id` | integer | NOT NULL, FK → `res_partner`, ON DELETE RESTRICT |  |
| `partner_name` | varchar |  |  |
| `partner_lang` | varchar |  |  |
| `partner_email` | varchar |  |  |
| `partner_address` | varchar |  |  |
| `partner_zip` | varchar |  |  |
| `partner_city` | varchar |  |  |
| `partner_state_id` | integer | FK → `res_country_state`, ON DELETE SET NULL (défaut ORM) |  |
| `partner_country_id` | integer | FK → `res_country`, ON DELETE SET NULL (défaut ORM) |  |
| `partner_phone` | varchar |  |  |
| `payment_id` | integer | FK → `account_payment`, ON DELETE SET NULL (défaut ORM) |  |
| `is_donation` | boolean |  |  |

**Table de relation** `account_invoice_transaction_rel` (champ `invoice_ids`) : `transaction_id` → `payment_transaction`, `invoice_id` → `account_move`.

**Table de relation** `sale_order_transaction_rel` (champ `sale_order_ids`) : `transaction_id` → `payment_transaction`, `sale_order_id` → `sale_order`.

**Contraintes**
- `reference_uniq` : `unique(reference)`

## portal.mixin — aucune table

*Type : modèle abstrait.*

Pas de table propre : ces champs sont copiés dans la table de chaque modèle qui hérite de celui-ci.

| Champ | Type | Remarque |
|---|---|---|
| `access_token` | varchar |  |

## product.category — table `product_category`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | varchar | NOT NULL, indexé |  |
| `complete_name` | varchar |  |  |
| `parent_id` | integer | indexé, FK → `product_category`, ON DELETE CASCADE |  |
| `parent_path` | varchar | indexé |  |
| `product_properties_definition` | jsonb |  | JSON natif (données structurées) |
| `property_account_income_categ_id` | jsonb |  | JSON : une valeur par société |
| `property_account_expense_categ_id` | jsonb |  | JSON : une valeur par société |
| `removal_strategy_id` | integer | FK → `product_removal`, ON DELETE SET NULL (défaut ORM) |  |
| `packaging_reserve_method` | varchar |  |  |
| `property_valuation` | jsonb |  | JSON : une valeur par société |
| `property_cost_method` | jsonb |  | JSON : une valeur par société |
| `property_stock_journal` | jsonb |  | JSON : une valeur par société |
| `property_stock_valuation_account_id` | jsonb |  | JSON : une valeur par société |
| `property_price_difference_account_id` | jsonb |  | JSON : une valeur par société |

**Table de relation** `stock_route_categ` (champ `route_ids`) : `categ_id` → `product_category`, `route_id` → `stock_route`.

## product.pricelist — table `product_pricelist`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | jsonb | NOT NULL | JSON : une valeur par langue |
| `active` | boolean |  |  |
| `sequence` | integer |  |  |
| `currency_id` | integer | NOT NULL, FK → `res_currency`, ON DELETE RESTRICT (défaut ORM) |  |
| `company_id` | integer | FK → `res_company`, ON DELETE SET NULL (défaut ORM) |  |
| `website_id` | integer | FK → `website`, ON DELETE RESTRICT |  |
| `code` | varchar |  |  |
| `selectable` | boolean |  |  |

**Table de relation** `res_country_group_pricelist_rel` (champ `country_group_ids`) : `pricelist_id` → `product_pricelist`, `res_country_group_id` → `res_country_group`.

## product.pricelist.item — table `product_pricelist_item`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `pricelist_id` | integer | indexé, FK → `product_pricelist`, ON DELETE CASCADE |  |
| `company_id` | integer | FK → `res_company`, ON DELETE SET NULL (défaut ORM) |  |
| `currency_id` | integer | FK → `res_currency`, ON DELETE SET NULL (défaut ORM) |  |
| `date_start` | timestamp |  |  |
| `date_end` | timestamp |  |  |
| `min_quantity` | numeric |  |  |
| `applied_on` | varchar | NOT NULL |  |
| `display_applied_on` | varchar | NOT NULL |  |
| `categ_id` | integer | FK → `product_category`, ON DELETE CASCADE |  |
| `product_tmpl_id` | integer | indexé, FK → `product_template`, ON DELETE CASCADE |  |
| `product_id` | integer | indexé, FK → `product_product`, ON DELETE CASCADE |  |
| `base` | varchar | NOT NULL |  |
| `base_pricelist_id` | integer | FK → `product_pricelist`, ON DELETE SET NULL (défaut ORM) |  |
| `compute_price` | varchar | NOT NULL, indexé |  |
| `fixed_price` | double precision |  |  |
| `percent_price` | double precision |  |  |
| `price_discount` | numeric |  |  |
| `price_round` | double precision |  |  |
| `price_surcharge` | double precision |  |  |
| `price_markup` | numeric |  |  |
| `price_min_margin` | double precision |  |  |
| `price_max_margin` | double precision |  |  |

## product.product — table `product_product`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `default_code` | varchar | indexé |  |
| `active` | boolean |  |  |
| `product_tmpl_id` | integer | NOT NULL, indexé, FK → `product_template`, ON DELETE CASCADE |  |
| `barcode` | varchar | indexé |  |
| `combination_indices` | varchar | indexé |  |
| `standard_price` | jsonb |  | JSON : une valeur par société |
| `volume` | numeric |  |  |
| `weight` | numeric |  |  |
| `can_image_variant_1024_be_zoomed` | boolean |  |  |
| `is_favorite` | boolean |  |  |
| `is_in_selected_section_of_order` | boolean |  |  |
| `lot_properties_definition` | jsonb |  | JSON natif (données structurées) |
| `gelato_product_uid` | varchar |  |  |
| `variant_ribbon_id` | integer | FK → `product_ribbon`, ON DELETE SET NULL (défaut ORM) |  |
| `base_unit_count` | numeric | NOT NULL |  |
| `base_unit_id` | integer | FK → `website_base_unit`, ON DELETE SET NULL (défaut ORM) |  |

**Table de relation** `product_variant_combination` (champs `product_template_attribute_value_ids`, `product_template_variant_value_ids`) : `product_product_id` → `product_product`, `product_template_attribute_value_id` → `product_template_attribute_value`.

**Table de relation** `product_tag_product_product_rel` (champ `additional_product_tag_ids`) : `product_product_id` → `product_product`, `product_tag_id` → `product_tag`.

**Table de relation** `stock_notification_product_partner_rel` (champ `stock_notification_partner_ids`) : `product_product_id` → `product_product`, `res_partner_id` → `res_partner`.

**Index** (nom déclaré dans le code)
- `combination_unique` : `(product_tmpl_id, combination_indices) WHERE active IS TRUE`
- `is_favorite_index` : `(is_favorite) WHERE is_favorite IS TRUE`

## product.public.category — table `product_public_category`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | jsonb | NOT NULL | JSON : une valeur par langue |
| `sequence` | integer | indexé |  |
| `parent_id` | integer | indexé, FK → `product_public_category`, ON DELETE CASCADE |  |
| `parent_path` | varchar | indexé |  |
| `website_description` | jsonb |  | JSON : une valeur par langue |
| `website_footer` | jsonb |  | JSON : une valeur par langue |
| `show_category_title` | boolean |  |  |
| `show_category_description` | boolean |  |  |
| `align_category_content` | boolean |  |  |

**Table de relation** `product_public_category_product_template_rel` (champ `product_tmpl_ids`) : `product_public_category_id` → `product_public_category`, `product_template_id` → `product_template`.

## product.tag — table `product_tag`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | jsonb | NOT NULL | JSON : une valeur par langue |
| `sequence` | integer |  |  |
| `color` | varchar |  |  |
| `visible_to_customers` | boolean |  |  |

**Table de relation** `product_tag_product_template_rel` (champ `product_template_ids`) : `product_tag_id` → `product_tag`, `product_template_id` → `product_template`.

**Table de relation** `product_tag_product_product_rel` (champ `product_product_ids`) : `product_tag_id` → `product_tag`, `product_product_id` → `product_product`.

**Contraintes**
- `name_uniq` : `unique (name)`

## product.template — table `product_template`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | jsonb | NOT NULL, indexé | JSON : une valeur par langue |
| `sequence` | integer |  |  |
| `description` | jsonb | indexé | JSON : une valeur par langue |
| `description_purchase` | jsonb |  | JSON : une valeur par langue |
| `description_sale` | jsonb | indexé | JSON : une valeur par langue |
| `type` | varchar | NOT NULL |  |
| `service_tracking` | varchar | NOT NULL |  |
| `categ_id` | integer | FK → `product_category`, ON DELETE SET NULL (défaut ORM) |  |
| `list_price` | double precision |  |  |
| `volume` | numeric |  |  |
| `weight` | numeric |  |  |
| `sale_ok` | boolean |  |  |
| `purchase_ok` | boolean |  |  |
| `uom_id` | integer | NOT NULL, FK → `uom_uom`, ON DELETE RESTRICT (défaut ORM) |  |
| `company_id` | integer | indexé, FK → `res_company`, ON DELETE SET NULL (défaut ORM) |  |
| `active` | boolean |  |  |
| `color` | integer |  |  |
| `default_code` | varchar |  |  |
| `can_image_1024_be_zoomed` | boolean |  |  |
| `has_configurable_attributes` | boolean |  |  |
| `is_favorite` | boolean |  |  |
| `product_properties` | jsonb |  | JSON natif (données structurées) |
| `property_account_income_id` | jsonb |  | JSON : une valeur par société |
| `property_account_expense_id` | jsonb |  | JSON : une valeur par société |
| `service_type` | varchar |  |  |
| `sale_line_warn_msg` | text |  |  |
| `expense_policy` | varchar |  |  |
| `invoice_policy` | varchar |  |  |
| `is_storable` | boolean |  |  |
| `responsible_id` | jsonb |  | JSON : une valeur par société |
| `property_stock_production` | jsonb |  | JSON : une valeur par société |
| `property_stock_inventory` | jsonb |  | JSON : une valeur par société |
| `sale_delay` | integer |  |  |
| `tracking` | varchar | NOT NULL |  |
| `lot_sequence_id` | integer | FK → `ir_sequence`, ON DELETE SET NULL (défaut ORM) |  |
| `description_picking` | jsonb |  | JSON : une valeur par langue |
| `description_pickingout` | jsonb |  | JSON : une valeur par langue |
| `description_pickingin` | jsonb |  | JSON : une valeur par langue |
| `lot_valuated` | boolean |  |  |
| `property_price_difference_account_id` | jsonb |  | JSON : une valeur par société |
| `hs_code` | varchar |  |  |
| `country_of_origin` | integer | FK → `res_country`, ON DELETE SET NULL (défaut ORM) |  |
| `gelato_template_ref` | varchar |  |  |
| `website_description` | jsonb | indexé | JSON : une valeur par langue |
| `description_ecommerce` | jsonb | indexé | JSON : une valeur par langue |
| `website_size_x` | integer |  |  |
| `website_size_y` | integer |  |  |
| `website_ribbon_id` | integer | FK → `product_ribbon`, ON DELETE SET NULL (défaut ORM) |  |
| `website_sequence` | integer | indexé |  |
| `publish_date` | timestamp | NOT NULL |  |
| `base_unit_count` | numeric | NOT NULL |  |
| `base_unit_id` | integer | FK → `website_base_unit`, ON DELETE SET NULL (défaut ORM) |  |
| `compare_list_price` | numeric |  |  |
| `variants_default_code` | varchar | indexé |  |
| `allow_out_of_stock_order` | boolean |  |  |
| `available_threshold` | double precision |  |  |
| `show_availability` | boolean |  |  |
| `out_of_stock_message` | jsonb |  | JSON : une valeur par langue |

**Table de relation** `product_combo_product_template_rel` (champ `combo_ids`) : `product_template_id` → `product_template`, `product_combo_id` → `product_combo`.

**Table de relation** `product_template_uom_uom_rel` (champ `uom_ids`) : `product_template_id` → `product_template`, `uom_uom_id` → `uom_uom`.

**Table de relation** `product_tag_product_template_rel` (champ `product_tag_ids`) : `product_template_id` → `product_template`, `product_tag_id` → `product_tag`.

**Table de relation** `product_taxes_rel` (champ `taxes_id`) : `prod_id` → `product_template`, `tax_id` → `account_tax`.

**Table de relation** `product_supplier_taxes_rel` (champ `supplier_taxes_id`) : `prod_id` → `product_template`, `tax_id` → `account_tax`.

**Table de relation** `account_account_tag_product_template_rel` (champ `account_tag_ids`) : `product_template_id` → `product_template`, `account_account_tag_id` → `account_account_tag`.

**Table de relation** `product_optional_rel` (champ `optional_product_ids`) : `src_id` → `product_template`, `dest_id` → `product_template`.

**Table de relation** `stock_route_product` (champ `route_ids`) : `product_id` → `product_template`, `route_id` → `stock_route`.

**Table de relation** `product_alternative_rel` (champ `alternative_product_ids`) : `src_id` → `product_template`, `dest_id` → `product_template`.

**Table de relation** `product_accessory_rel` (champ `accessory_product_ids`) : `src_id` → `product_template`, `dest_id` → `product_product`.

**Table de relation** `product_public_category_product_template_rel` (champ `public_categ_ids`) : `product_template_id` → `product_template`, `product_public_category_id` → `product_public_category`.

**Index** (nom déclaré dans le code)
- `is_favorite_index` : `(is_favorite) WHERE is_favorite IS TRUE`
- `name_gist_idx` : index GIST trigramme (recherche floue e-commerce), définition calculée à l'exécution : `USING GIST(unaccent((JSONB_PATH_QUERY_ARRAY(name, '$.*'::jsonpath))::text) gist_trgm_ops)` si `unaccent` est indexable, sinon `USING GIST((JSONB_PATH_QUERY_ARRAY(name, '$.*'::jsonpath)::text) gist_trgm_ops)` ; aucun index si `pg_trgm` est absent
- `description_gist_idx` : index GIST trigramme (recherche floue e-commerce), définition calculée à l'exécution : `USING GIST(unaccent((JSONB_PATH_QUERY_ARRAY(description, '$.*'::jsonpath))::text) gist_trgm_ops)` si `unaccent` est indexable, sinon `USING GIST((JSONB_PATH_QUERY_ARRAY(description, '$.*'::jsonpath)::text) gist_trgm_ops)` ; aucun index si `pg_trgm` est absent
- `description_sale_gist_idx` : index GIST trigramme (recherche floue e-commerce), définition calculée à l'exécution : `USING GIST(unaccent((JSONB_PATH_QUERY_ARRAY(description_sale, '$.*'::jsonpath))::text) gist_trgm_ops)` si `unaccent` est indexable, sinon `USING GIST((JSONB_PATH_QUERY_ARRAY(description_sale, '$.*'::jsonpath)::text) gist_trgm_ops)` ; aucun index si `pg_trgm` est absent
- `description_ecommerce_gist_idx` : index GIST trigramme (recherche floue e-commerce), définition calculée à l'exécution : `USING GIST(unaccent((JSONB_PATH_QUERY_ARRAY(description_ecommerce, '$.*'::jsonpath))::text) gist_trgm_ops)` si `unaccent` est indexable, sinon `USING GIST((JSONB_PATH_QUERY_ARRAY(description_ecommerce, '$.*'::jsonpath)::text) gist_trgm_ops)` ; aucun index si `pg_trgm` est absent
- `default_code_gist_idx` : index GIST trigramme (recherche floue e-commerce), définition calculée à l'exécution : `USING GIST(unaccent(default_code) gist_trgm_ops)` si `unaccent` est indexable, sinon `USING GIST(default_code gist_trgm_ops)` ; aucun index si `pg_trgm` est absent

## product.wishlist — table `product_wishlist`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `partner_id` | integer | indexé, FK → `res_partner`, ON DELETE SET NULL (défaut ORM) |  |
| `product_id` | integer | NOT NULL, FK → `product_product`, ON DELETE RESTRICT (défaut ORM) |  |
| `pricelist_id` | integer | FK → `product_pricelist`, ON DELETE SET NULL (défaut ORM) |  |
| `price` | numeric |  |  |
| `website_id` | integer | NOT NULL, FK → `website`, ON DELETE CASCADE |  |
| `active` | boolean | NOT NULL |  |

**Contraintes**
- `product_unique_partner_id` : `UNIQUE(product_id, partner_id)`

## res.partner — table `res_partner`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | varchar | indexé |  |
| `complete_name` | varchar | indexé |  |
| `parent_id` | integer | indexé, FK → `res_partner`, ON DELETE SET NULL (défaut ORM) |  |
| `ref` | varchar | indexé |  |
| `lang` | varchar |  |  |
| `tz` | varchar |  |  |
| `user_id` | integer | FK → `res_users`, ON DELETE SET NULL (défaut ORM) |  |
| `vat` | varchar | indexé |  |
| `company_registry` | varchar | indexé |  |
| `website` | varchar |  |  |
| `comment` | text |  |  |
| `active` | boolean |  |  |
| `employee` | boolean |  |  |
| `function` | varchar |  |  |
| `type` | varchar |  |  |
| `street` | varchar |  |  |
| `street2` | varchar |  |  |
| `zip` | varchar |  |  |
| `city` | varchar |  |  |
| `state_id` | integer | FK → `res_country_state`, ON DELETE RESTRICT |  |
| `country_id` | integer | FK → `res_country`, ON DELETE RESTRICT |  |
| `partner_latitude` | numeric |  |  |
| `partner_longitude` | numeric |  |  |
| `email` | varchar |  |  |
| `phone` | varchar |  |  |
| `is_company` | boolean |  |  |
| `industry_id` | integer | FK → `res_partner_industry`, ON DELETE SET NULL (défaut ORM) |  |
| `company_id` | integer | indexé, FK → `res_company`, ON DELETE SET NULL (défaut ORM) |  |
| `color` | integer |  |  |
| `partner_share` | boolean |  |  |
| `commercial_partner_id` | integer | indexé, FK → `res_partner`, ON DELETE SET NULL (défaut ORM) |  |
| `commercial_company_name` | varchar |  |  |
| `company_name` | varchar |  |  |
| `barcode` | jsonb |  | JSON : une valeur par société |
| `email_normalized` | varchar | indexé |  |
| `signup_type` | varchar |  |  |
| `specific_property_product_pricelist` | jsonb |  | JSON : une valeur par société |
| `credit_limit` | jsonb |  | JSON : une valeur par société |
| `property_account_payable_id` | jsonb |  | JSON : une valeur par société |
| `property_account_receivable_id` | jsonb |  | JSON : une valeur par société |
| `property_account_position_id` | jsonb |  | JSON : une valeur par société |
| `property_payment_term_id` | jsonb |  | JSON : une valeur par société |
| `property_supplier_payment_term_id` | jsonb |  | JSON : une valeur par société |
| `trust` | jsonb |  | JSON : une valeur par société |
| `ignore_abnormal_invoice_date` | jsonb |  | JSON : une valeur par société |
| `ignore_abnormal_invoice_amount` | jsonb |  | JSON : une valeur par société |
| `invoice_sending_method` | jsonb |  | JSON : une valeur par société |
| `invoice_edi_format_store` | jsonb |  | JSON : une valeur par société |
| `invoice_template_pdf_report_id` | integer | FK → `ir_act_report_xml`, ON DELETE SET NULL (défaut ORM) |  |
| `supplier_rank` | integer |  |  |
| `customer_rank` | integer |  |  |
| `autopost_bills` | varchar | NOT NULL |  |
| `property_outbound_payment_method_line_id` | jsonb |  | JSON : une valeur par société |
| `property_inbound_payment_method_line_id` | jsonb |  | JSON : une valeur par société |
| `date_localization` | date |  |  |
| `sale_warn_msg` | text |  |  |
| `property_delivery_carrier_id` | jsonb |  | JSON : une valeur par société |
| `is_pickup_location` | boolean |  |  |
| `property_stock_customer` | jsonb |  | JSON : une valeur par société |
| `property_stock_supplier` | jsonb |  | JSON : une valeur par société |
| `picking_warn_msg` | text |  |  |
| `website_description` | jsonb |  | JSON : une valeur par langue |
| `website_short_description` | jsonb |  | JSON : une valeur par langue |
| `is_published` | boolean |  |  |

**Table de relation** `res_partner_res_partner_category_rel` (champ `category_id`) : `partner_id` → `res_partner`, `category_id` → `res_partner_category`.

**Table de relation** `discuss_channel_member` (champ `channel_ids`) : `partner_id` → `res_partner`, `channel_id` → `discuss_channel`.

**Contraintes**
- `check_name` : `CHECK( (type='contact' AND name IS NOT NULL) or (type!='contact') )`

## res.users — table `res_users`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `partner_id` | integer | NOT NULL, indexé, FK → `res_partner`, ON DELETE RESTRICT |  |
| `login` | varchar | NOT NULL |  |
| `signature` | text |  |  |
| `active` | boolean |  |  |
| `action_id` | integer | FK → `ir_actions`, ON DELETE SET NULL (défaut ORM) |  |
| `share` | boolean |  |  |
| `company_id` | integer | NOT NULL, FK → `res_company`, ON DELETE RESTRICT (défaut ORM) |  |
| `tour_enabled` | boolean |  |  |
| `notification_type` | varchar | NOT NULL |  |
| `out_of_office_from` | timestamp |  |  |
| `out_of_office_to` | timestamp |  |  |
| `out_of_office_message` | text |  |  |
| `manual_im_status` | varchar |  |  |
| `oauth_provider_id` | integer | FK → `auth_oauth_provider`, ON DELETE SET NULL (défaut ORM) |  |
| `oauth_uid` | varchar |  |  |
| `oauth_access_token` | varchar |  |  |
| `totp_last_counter` | integer |  |  |
| `sale_team_id` | integer | FK → `crm_team`, ON DELETE SET NULL (défaut ORM) |  |
| `property_warehouse_id` | jsonb |  | JSON : une valeur par société |
| `website_id` | integer | FK → `website`, ON DELETE SET NULL (défaut ORM) |  |

**Table de relation** `res_company_users_rel` (champ `company_ids`) : `user_id` → `res_users`, `cid` → `res_company`.

**Table de relation** `res_groups_users_rel` (champ `group_ids`) : `uid` → `res_users`, `gid` → `res_groups`.

**Table de relation** `res_role_res_users_rel` (champ `role_ids`) : `res_users_id` → `res_users`, `res_role_id` → `res_role`.

**Contraintes**
- `login_key` : `UNIQUE (login)`
- `notification_type` : `CHECK (notification_type = 'email' OR NOT share)`
- `uniq_users_oauth_provider_oauth_uid` : `unique(oauth_provider_id, oauth_uid)`
- `login_key` : `unique (login, website_id)`

## res.users.deletion — table `res_users_deletion`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `user_id` | integer | FK → `res_users`, ON DELETE SET NULL |  |
| `user_id_int` | integer |  |  |
| `state` | varchar | NOT NULL |  |

## sale.order — table `sale_order`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques; `create_date` indexé (redéclaré dans `sale`) |
| `name` | varchar | NOT NULL, indexé |  |
| `company_id` | integer | NOT NULL, indexé, FK → `res_company`, ON DELETE RESTRICT (défaut ORM) |  |
| `partner_id` | integer | NOT NULL, indexé, FK → `res_partner`, ON DELETE RESTRICT (défaut ORM) |  |
| `state` | varchar | indexé |  |
| `locked` | boolean |  |  |
| `client_order_ref` | varchar |  |  |
| `commitment_date` | timestamp |  |  |
| `date_order` | timestamp | NOT NULL |  |
| `origin` | varchar |  |  |
| `reference` | varchar |  |  |
| `pending_email_template_id` | integer | FK → `mail_template`, ON DELETE SET NULL |  |
| `require_signature` | boolean |  |  |
| `require_payment` | boolean |  |  |
| `prepayment_percent` | double precision |  |  |
| `signed_by` | varchar |  |  |
| `signed_on` | timestamp |  |  |
| `validity_date` | date |  |  |
| `journal_id` | integer | FK → `account_journal`, ON DELETE SET NULL (défaut ORM) |  |
| `note` | text |  |  |
| `partner_invoice_id` | integer | NOT NULL, indexé, FK → `res_partner`, ON DELETE RESTRICT (défaut ORM) |  |
| `partner_shipping_id` | integer | NOT NULL, indexé, FK → `res_partner`, ON DELETE RESTRICT (défaut ORM) |  |
| `fiscal_position_id` | integer | FK → `account_fiscal_position`, ON DELETE SET NULL (défaut ORM) |  |
| `payment_term_id` | integer | FK → `account_payment_term`, ON DELETE SET NULL (défaut ORM) |  |
| `preferred_payment_method_line_id` | integer | FK → `account_payment_method_line`, ON DELETE SET NULL (défaut ORM) |  |
| `pricelist_id` | integer | FK → `product_pricelist`, ON DELETE SET NULL (défaut ORM) |  |
| `currency_id` | integer | FK → `res_currency`, ON DELETE RESTRICT |  |
| `currency_rate` | numeric |  |  |
| `user_id` | integer | indexé, FK → `res_users`, ON DELETE SET NULL (défaut ORM) |  |
| `team_id` | integer | indexé, FK → `crm_team`, ON DELETE SET NULL |  |
| `amount_untaxed` | numeric |  |  |
| `amount_tax` | numeric |  |  |
| `amount_total` | numeric |  |  |
| `invoice_status` | varchar |  |  |
| `campaign_id` | integer | FK → `utm_campaign`, ON DELETE SET NULL |  |
| `medium_id` | integer | FK → `utm_medium`, ON DELETE SET NULL |  |
| `source_id` | integer | FK → `utm_source`, ON DELETE SET NULL |  |
| `pickup_location_data` | jsonb |  | JSON natif (données structurées) |
| `carrier_id` | integer | FK → `delivery_carrier`, ON DELETE SET NULL (défaut ORM) |  |
| `delivery_message` | varchar |  |  |
| `recompute_delivery_price` | boolean |  |  |
| `shipping_weight` | double precision |  |  |
| `incoterm` | integer | FK → `account_incoterms`, ON DELETE SET NULL (défaut ORM) |  |
| `incoterm_location` | varchar |  |  |
| `picking_policy` | varchar | NOT NULL |  |
| `warehouse_id` | integer | FK → `stock_warehouse`, ON DELETE SET NULL (défaut ORM) |  |
| `delivery_status` | varchar |  |  |
| `effective_date` | timestamp |  |  |
| `sale_order_template_id` | integer | FK → `sale_order_template`, ON DELETE SET NULL (défaut ORM) |  |
| `website_id` | integer | FK → `website`, ON DELETE SET NULL (défaut ORM) |  |
| `cart_recovery_email_sent` | boolean |  |  |
| `shop_warning` | varchar |  |  |

**Table de relation** `sale_order_transaction_rel` (champ `transaction_ids`) : `sale_order_id` → `sale_order`, `transaction_id` → `payment_transaction`.

**Table de relation** `sale_order_tag_rel` (champ `tag_ids`) : `order_id` → `sale_order`, `tag_id` → `crm_tag`.

**Table de relation** `stock_reference_sale_rel` (champ `stock_reference_ids`) : `sale_id` → `sale_order`, `reference_id` → `stock_reference`.

**Table de relation** `loyalty_card_sale_order_rel` (champ `applied_coupon_ids`) : `sale_order_id` → `sale_order`, `loyalty_card_id` → `loyalty_card`.

**Table de relation** `loyalty_rule_sale_order_rel` (champ `code_enabled_rule_ids`) : `sale_order_id` → `sale_order`, `loyalty_rule_id` → `loyalty_rule`.

**Table de relation** `sale_order_disabled_auto_rewards_rel` (champ `disabled_auto_rewards`) : `sale_order_id` → `sale_order`, `loyalty_reward_id` → `loyalty_reward`.

**Contraintes**
- `date_order_conditional_required` : `CHECK((state = 'sale' AND date_order IS NOT NULL) OR state != 'sale')`

**Index** (nom déclaré dans le code)
- `date_order_id_idx` : `(date_order desc, id desc)`

## sale.report — vue `sale_report`

*Type : vue SQL.*

Vue SQL (`_auto = False`) : les colonnes réelles viennent de la requête de la vue. Le tableau liste les champs Python déclarés.

| Champ | Type | Remarque |
|---|---|---|
| `name` | varchar |  |
| `date` | timestamp |  |
| `partner_id` | référence → `res_partner` |  |
| `company_id` | référence → `res_company` |  |
| `pricelist_id` | référence → `product_pricelist` |  |
| `team_id` | référence → `crm_team` |  |
| `user_id` | référence → `res_users` |  |
| `state` | varchar |  |
| `invoice_status` | varchar |  |
| `campaign_id` | référence → `utm_campaign` |  |
| `medium_id` | référence → `utm_medium` |  |
| `source_id` | référence → `utm_source` |  |
| `commercial_partner_id` | référence → `res_partner` |  |
| `country_id` | référence → `res_country` |  |
| `industry_id` | référence → `res_partner_industry` |  |
| `partner_zip` | varchar |  |
| `state_id` | référence → `res_country_state` |  |
| `order_reference` | varchar |  |
| `categ_id` | référence → `product_category` |  |
| `product_id` | référence → `product_product` |  |
| `product_tmpl_id` | référence → `product_template` |  |
| `product_uom_id` | référence → `uom_uom` |  |
| `product_uom_qty` | double precision |  |
| `qty_to_deliver` | double precision |  |
| `qty_delivered` | double precision |  |
| `qty_to_invoice` | double precision |  |
| `qty_invoiced` | double precision |  |
| `price_subtotal` | numeric |  |
| `price_total` | numeric |  |
| `untaxed_amount_to_invoice` | numeric |  |
| `untaxed_amount_invoiced` | numeric |  |
| `line_invoice_status` | varchar |  |
| `weight` | double precision |  |
| `volume` | double precision |  |
| `price_unit` | double precision |  |
| `discount` | double precision |  |
| `discount_amount` | numeric |  |
| `nbr` | integer |  |
| `currency_id` | référence → `res_currency` |  |
| `warehouse_id` | référence → `stock_warehouse` |  |
| `website_id` | référence → `website` |  |
| `is_abandoned_cart` | boolean |  |

## stock.move — table `stock_move`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `sequence` | integer |  |  |
| `priority` | varchar |  |  |
| `date` | timestamp | NOT NULL, indexé |  |
| `date_deadline` | timestamp |  |  |
| `company_id` | integer | NOT NULL, indexé, FK → `res_company`, ON DELETE RESTRICT (défaut ORM) |  |
| `product_id` | integer | NOT NULL, indexé, FK → `product_product`, ON DELETE RESTRICT (défaut ORM) |  |
| `description_picking_manual` | text |  |  |
| `product_qty` | numeric |  |  |
| `product_uom_qty` | numeric | NOT NULL |  |
| `product_uom` | integer | NOT NULL, FK → `uom_uom`, ON DELETE RESTRICT (défaut ORM) |  |
| `location_id` | integer | NOT NULL, indexé, FK → `stock_location`, ON DELETE RESTRICT (défaut ORM) |  |
| `location_dest_id` | integer | NOT NULL, indexé, FK → `stock_location`, ON DELETE RESTRICT (défaut ORM) |  |
| `location_final_id` | integer | indexé, FK → `stock_location`, ON DELETE SET NULL (défaut ORM) |  |
| `partner_id` | integer | indexé, FK → `res_partner`, ON DELETE SET NULL (défaut ORM) |  |
| `picking_id` | integer | indexé, FK → `stock_picking`, ON DELETE SET NULL (défaut ORM) |  |
| `state` | varchar | indexé |  |
| `picked` | boolean |  |  |
| `price_unit` | double precision |  |  |
| `origin` | varchar |  |  |
| `procure_method` | varchar | NOT NULL |  |
| `scrap_id` | integer | indexé, FK → `stock_scrap`, ON DELETE SET NULL (défaut ORM) |  |
| `rule_id` | integer | FK → `stock_rule`, ON DELETE RESTRICT |  |
| `propagate_cancel` | boolean |  |  |
| `delay_alert_date` | timestamp |  |  |
| `picking_type_id` | integer | FK → `stock_picking_type`, ON DELETE SET NULL (défaut ORM) |  |
| `is_inventory` | boolean |  |  |
| `inventory_name` | varchar |  |  |
| `origin_returned_move_id` | integer | indexé, FK → `stock_move`, ON DELETE SET NULL (défaut ORM) |  |
| `restrict_partner_id` | integer | indexé, FK → `res_partner`, ON DELETE SET NULL (défaut ORM) |  |
| `warehouse_id` | integer | FK → `stock_warehouse`, ON DELETE SET NULL (défaut ORM) |  |
| `quantity` | numeric |  |  |
| `additional` | boolean |  |  |
| `reference` | varchar |  |  |
| `next_serial` | varchar |  |  |
| `next_serial_count` | integer |  |  |
| `orderpoint_id` | integer | indexé, FK → `stock_warehouse_orderpoint`, ON DELETE SET NULL (défaut ORM) |  |
| `reservation_date` | date |  |  |
| `packaging_uom_id` | integer | FK → `uom_uom`, ON DELETE SET NULL (défaut ORM) |  |
| `packaging_uom_qty` | double precision |  |  |
| `to_refund` | boolean |  |  |
| `value` | numeric |  |  |
| `is_in` | boolean |  |  |
| `is_out` | boolean |  |  |
| `is_dropship` | boolean |  |  |
| `account_move_id` | integer | indexé, FK → `account_move`, ON DELETE SET NULL (défaut ORM) |  |
| `sale_line_id` | integer | indexé, FK → `sale_order_line`, ON DELETE SET NULL (défaut ORM) |  |
| `weight` | numeric |  |  |

**Table de relation** `template_attribute_value_stock_move_rel` (champ `never_product_template_attribute_value_ids`) : `move_id` → `stock_move`, `template_attribute_value_id` → `product_template_attribute_value`.

**Table de relation** `stock_move_move_rel` (champ `move_dest_ids`) : `move_orig_id` → `stock_move`, `move_dest_id` → `stock_move`.

**Table de relation** `stock_move_move_rel` (champ `move_orig_ids`) : `move_dest_id` → `stock_move`, `move_orig_id` → `stock_move`.

**Table de relation** `stock_reference_move_rel` (champ `reference_ids`) : `move_id` → `stock_move`, `reference_id` → `stock_reference`.

**Table de relation** `stock_route_move` (champ `route_ids`) : `move_id` → `stock_move`, `route_id` → `stock_route`.

**Table de relation** `account_analytic_line_stock_move_rel` (champ `analytic_account_line_ids`) : `stock_move_id` → `stock_move`, `account_analytic_line_id` → `account_analytic_line`.

**Index** (nom déclaré dans le code)
- `product_location_index` : `(product_id, location_id, location_dest_id, company_id, state)`

## stock.picking — table `stock_picking`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | varchar | indexé |  |
| `origin` | varchar | indexé |  |
| `note` | text |  |  |
| `backorder_id` | integer | indexé, FK → `stock_picking`, ON DELETE SET NULL (défaut ORM) |  |
| `return_id` | integer | indexé, FK → `stock_picking`, ON DELETE SET NULL (défaut ORM) |  |
| `move_type` | varchar | NOT NULL |  |
| `state` | varchar | indexé |  |
| `priority` | varchar |  |  |
| `scheduled_date` | timestamp | indexé |  |
| `date_deadline` | timestamp |  |  |
| `has_deadline_issue` | boolean |  |  |
| `date_done` | timestamp |  |  |
| `location_id` | integer | NOT NULL, FK → `stock_location`, ON DELETE RESTRICT (défaut ORM) |  |
| `location_dest_id` | integer | NOT NULL, FK → `stock_location`, ON DELETE RESTRICT (défaut ORM) |  |
| `picking_type_id` | integer | NOT NULL, indexé, FK → `stock_picking_type`, ON DELETE RESTRICT (défaut ORM) |  |
| `partner_id` | integer | indexé, FK → `res_partner`, ON DELETE SET NULL (défaut ORM) |  |
| `company_id` | integer | indexé, FK → `res_company`, ON DELETE SET NULL (défaut ORM) |  |
| `user_id` | integer | FK → `res_users`, ON DELETE SET NULL (défaut ORM) |  |
| `owner_id` | integer | indexé, FK → `res_partner`, ON DELETE SET NULL (défaut ORM) |  |
| `printed` | boolean |  |  |
| `is_locked` | boolean |  |  |
| `shipping_weight` | numeric |  |  |
| `picking_properties` | jsonb |  | JSON natif (données structurées) |
| `sale_id` | integer | indexé, FK → `sale_order`, ON DELETE SET NULL (défaut ORM) |  |
| `carrier_price` | double precision |  |  |
| `carrier_id` | integer | FK → `delivery_carrier`, ON DELETE SET NULL (défaut ORM) |  |
| `weight` | numeric |  |  |
| `carrier_tracking_ref` | varchar |  |  |
| `website_id` | integer | FK → `website`, ON DELETE SET NULL (défaut ORM) |  |

**Table de relation** `stock_package_history_stock_picking_rel` (champ `package_history_ids`) : `stock_picking_id` → `stock_picking`, `stock_package_history_id` → `stock_package_history`.

**Contraintes**
- `name_uniq` : `unique(name, company_id)`

## stock.quant — table `stock_quant`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `product_id` | integer | NOT NULL, indexé, FK → `product_product`, ON DELETE RESTRICT |  |
| `company_id` | integer | FK → `res_company`, ON DELETE SET NULL (défaut ORM) |  |
| `location_id` | integer | NOT NULL, indexé, FK → `stock_location`, ON DELETE RESTRICT |  |
| `lot_id` | integer | indexé, FK → `stock_lot`, ON DELETE RESTRICT |  |
| `package_id` | integer | indexé, FK → `stock_package`, ON DELETE RESTRICT |  |
| `owner_id` | integer | indexé, FK → `res_partner`, ON DELETE SET NULL (défaut ORM) |  |
| `quantity` | numeric |  |  |
| `reserved_quantity` | numeric | NOT NULL |  |
| `in_date` | timestamp | NOT NULL |  |
| `inventory_quantity` | numeric |  |  |
| `inventory_diff_quantity` | numeric |  |  |
| `inventory_date` | date |  |  |
| `inventory_quantity_set` | boolean |  |  |
| `user_id` | integer | FK → `res_users`, ON DELETE SET NULL (défaut ORM) |  |
| `accounting_date` | date |  |  |

## stock.return.picking — table `stock_return_picking`

*Type : modèle transitoire (assistant).*

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `picking_id` | integer | FK → `stock_picking`, ON DELETE SET NULL (défaut ORM) |  |

## stock.warehouse — table `stock_warehouse`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | varchar | NOT NULL |  |
| `active` | boolean |  |  |
| `company_id` | integer | NOT NULL, FK → `res_company`, ON DELETE RESTRICT (défaut ORM) |  |
| `partner_id` | integer | FK → `res_partner`, ON DELETE SET NULL (défaut ORM) |  |
| `view_location_id` | integer | NOT NULL, indexé, FK → `stock_location`, ON DELETE RESTRICT (défaut ORM) |  |
| `lot_stock_id` | integer | NOT NULL, FK → `stock_location`, ON DELETE RESTRICT (défaut ORM) |  |
| `code` | varchar(5) | NOT NULL |  |
| `reception_steps` | varchar | NOT NULL |  |
| `delivery_steps` | varchar | NOT NULL |  |
| `wh_input_stock_loc_id` | integer | FK → `stock_location`, ON DELETE SET NULL (défaut ORM) |  |
| `wh_qc_stock_loc_id` | integer | FK → `stock_location`, ON DELETE SET NULL (défaut ORM) |  |
| `wh_output_stock_loc_id` | integer | FK → `stock_location`, ON DELETE SET NULL (défaut ORM) |  |
| `wh_pack_stock_loc_id` | integer | FK → `stock_location`, ON DELETE SET NULL (défaut ORM) |  |
| `mto_pull_id` | integer | FK → `stock_rule`, ON DELETE SET NULL (défaut ORM) |  |
| `pick_type_id` | integer | FK → `stock_picking_type`, ON DELETE SET NULL (défaut ORM) |  |
| `pack_type_id` | integer | FK → `stock_picking_type`, ON DELETE SET NULL (défaut ORM) |  |
| `out_type_id` | integer | FK → `stock_picking_type`, ON DELETE SET NULL (défaut ORM) |  |
| `in_type_id` | integer | FK → `stock_picking_type`, ON DELETE SET NULL (défaut ORM) |  |
| `int_type_id` | integer | FK → `stock_picking_type`, ON DELETE SET NULL (défaut ORM) |  |
| `qc_type_id` | integer | FK → `stock_picking_type`, ON DELETE SET NULL (défaut ORM) |  |
| `store_type_id` | integer | FK → `stock_picking_type`, ON DELETE SET NULL (défaut ORM) |  |
| `xdock_type_id` | integer | FK → `stock_picking_type`, ON DELETE SET NULL (défaut ORM) |  |
| `reception_route_id` | integer | FK → `stock_route`, ON DELETE RESTRICT |  |
| `delivery_route_id` | integer | FK → `stock_route`, ON DELETE RESTRICT |  |
| `sequence` | integer |  |  |
| `opening_hours` | integer | FK → `resource_calendar`, ON DELETE SET NULL (défaut ORM) |  |

**Table de relation** `stock_route_warehouse` (champ `route_ids`) : `warehouse_id` → `stock_warehouse`, `route_id` → `stock_route`.

**Table de relation** `stock_wh_resupply_table` (champ `resupply_wh_ids`) : `supplied_wh_id` → `stock_warehouse`, `supplier_wh_id` → `stock_warehouse`.

**Contraintes**
- `warehouse_name_uniq` : `unique(name, company_id)`
- `warehouse_code_uniq` : `unique(code, company_id)`

## website.checkout.step — table `website_checkout_step`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `name` | jsonb | NOT NULL | JSON : une valeur par langue |
| `sequence` | integer |  |  |
| `step_href` | varchar | NOT NULL |  |
| `main_button_label` | jsonb |  | JSON : une valeur par langue |
| `back_button_label` | jsonb |  | JSON : une valeur par langue |
| `website_id` | integer | FK → `website`, ON DELETE CASCADE |  |

## website.menu — table `website_menu`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `theme_template_id` | integer | indexé, FK → `theme_website_menu`, ON DELETE SET NULL (défaut ORM) |  |
| `name` | jsonb | NOT NULL | JSON : une valeur par langue |
| `url` | varchar | NOT NULL |  |
| `page_id` | integer | indexé, FK → `website_page`, ON DELETE CASCADE |  |
| `controller_page_id` | integer | indexé, FK → `website_controller_page`, ON DELETE CASCADE |  |
| `new_window` | boolean |  |  |
| `sequence` | integer |  |  |
| `website_id` | integer | FK → `website`, ON DELETE CASCADE |  |
| `parent_id` | integer | indexé, FK → `website_menu`, ON DELETE CASCADE |  |
| `parent_path` | varchar | indexé |  |
| `mega_menu_content` | jsonb |  | JSON : une valeur par langue |
| `mega_menu_classes` | varchar |  |  |

**Table de relation** `res_groups_website_menu_rel` (champ `group_ids`) : `website_menu_id` → `website_menu`, `res_groups_id` → `res_groups`.

## website.page — table `website_page`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `theme_template_id` | integer | indexé, FK → `theme_website_page`, ON DELETE SET NULL (défaut ORM) |  |
| `url` | varchar | NOT NULL |  |
| `view_id` | integer | NOT NULL, indexé, FK → `ir_ui_view`, ON DELETE CASCADE |  |
| `website_indexed` | boolean |  |  |
| `date_publish` | timestamp |  |  |
| `is_new_page_template` | boolean |  |  |
| `website_id` | integer | FK → `website`, ON DELETE CASCADE |  |

## website.published.mixin — aucune table

*Type : modèle abstrait.*

Pas de table propre : ces champs sont copiés dans la table de chaque modèle qui hérite de celui-ci.

| Champ | Type | Remarque |
|---|---|---|
| `is_published` | boolean |  |

## website.published.multi.mixin — aucune table

*Type : modèle abstrait.*

Pas de table propre : ces champs sont copiés dans la table de chaque modèle qui hérite de celui-ci.

Aucun champ stocké déclaré.

## website.searchable.mixin — aucune table

*Type : modèle abstrait.*

Pas de table propre : ces champs sont copiés dans la table de chaque modèle qui hérite de celui-ci.

Aucun champ stocké déclaré.

## website.track — table `website_track`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `visitor_id` | integer | NOT NULL, indexé, FK → `website_visitor`, ON DELETE CASCADE |  |
| `page_id` | integer | indexé, FK → `website_page`, ON DELETE CASCADE |  |
| `url` | text | indexé |  |
| `visit_datetime` | timestamp | NOT NULL |  |
| `product_id` | integer | indexé, FK → `product_product`, ON DELETE CASCADE |  |

## website.visitor — table `website_visitor`

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | serial | PK | |
| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |
| `create_date`, `write_date` | timestamp | | colonnes automatiques |
| `access_token` | varchar | NOT NULL |  |
| `website_id` | integer | FK → `website`, ON DELETE SET NULL (défaut ORM) |  |
| `partner_id` | integer | indexé, FK → `res_partner`, ON DELETE SET NULL (défaut ORM) |  |
| `country_id` | integer | FK → `res_country`, ON DELETE SET NULL (défaut ORM) |  |
| `lang_id` | integer | FK → `res_lang`, ON DELETE SET NULL (défaut ORM) |  |
| `timezone` | varchar |  |  |
| `visit_count` | integer |  |  |
| `last_connection_datetime` | timestamp |  |  |

**Contraintes**
- `access_token_unique` : `unique(access_token)`
