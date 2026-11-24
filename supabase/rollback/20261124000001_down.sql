-- Retour arrière complet des migrations 001 → 003 (environnement de développement UNIQUEMENT).
-- DESTRUCTIF : supprime toutes les données KEU DIRU. Sauvegarder avant toute exécution.
begin;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.search_resources(text, text, text, text, public.resource_level, text, int, int);
drop table if exists public.audit_log, public.contribution_reviews, public.contributions,
  public.learning_progress, public.favorites, public.learning_path_steps, public.learning_paths,
  public.collection_items, public.collections, public.resource_tags, public.resource_topics,
  public.resource_translations, public.resources, public.tags, public.resource_types, public.topics,
  public.disciplines, public.user_roles, public.profiles, public.languages cascade;
drop function if exists public.review_contribution(uuid, public.review_decision, text), public.set_user_role(uuid, public.app_role, boolean),
  public.has_min_role(public.app_role), public.handle_new_user(), public.write_audit(text, text, text, jsonb),
  public.audit_resource_status(), public.resources_publication_guard(), public.audit_resource_delete(),
  public.contributions_guard(), public.favorites_guard(), public.set_updated_at(), public.is_valid_labels(jsonb),
  public.ts_config_for(text), public.normalize_url(text), public.immutable_unaccent(text) cascade;
drop type if exists public.app_role, public.resource_status, public.contribution_status, public.contribution_kind,
  public.review_decision, public.link_status, public.resource_level, public.access_cost, public.editorial_status;
commit;
