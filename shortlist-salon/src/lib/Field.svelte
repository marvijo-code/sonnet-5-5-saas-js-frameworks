<script lang="ts">
  import type { Snippet } from 'svelte'
  let {
    label,
    id,
    error = '',
    hint = '',
    children,
  }: { label: string; id: string; error?: string; hint?: string; children: Snippet } = $props()
</script>

<div class="field" class:invalid={!!error}>
  <label for={id}>{label}</label>
  {@render children()}
  {#if hint}<p class="hint" id="{id}-hint">{hint}</p>{/if}
  {#if error}<p class="error" id="{id}-err" role="alert">{error}</p>{/if}
</div>
