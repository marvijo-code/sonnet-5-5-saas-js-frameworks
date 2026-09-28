<script lang="ts">
  let { percent, color = 'var(--green)', label }: { percent: number; color?: string; label: string } = $props()
</script>

<div class="bar" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}>
  <span style="width:{percent}%;background:{color}"></span>
</div>
