<script lang="ts">
  import { spineColor } from './logic'
  let { id, title, size = 'md' }: { id: string; title: string; size?: 'sm' | 'md' | 'lg' } = $props()
</script>

<span class="cover {size}" style="--spine:{spineColor(id)}" aria-hidden="true">
  <span class="cover-initial">{title.trim().charAt(0).toUpperCase() || '?'}</span>
</span>
