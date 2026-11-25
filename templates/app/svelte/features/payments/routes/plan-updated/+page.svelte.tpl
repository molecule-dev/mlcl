<!--
  The page a checkout returns to: it confirms the purchase with the API before thanking the
  user. This app has no billing page, so the receipt link is left out.
-->
<script lang="ts">
  import { PlanUpdated } from '@molecule/app-plan-updated-page-svelte'
</script>

<PlanUpdated receiptHref={null} />
