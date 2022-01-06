<script setup lang="ts">
import { watch } from 'vue'

const props = withDefaults(
  defineProps<{
    enabled: boolean
  }>(),
  {
    enabled: false,
  }
)

// display leave/reload site warning if enabled is true
watch(
  () => props.enabled,
  (val) => window.onbeforeunload = val ? () => true : null
)
</script>
