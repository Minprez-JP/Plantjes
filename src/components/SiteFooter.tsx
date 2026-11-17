import { CloudSun, Cloudy, Flower, Hourglass, Leaf, LeafyGreen, Settings, Snowflake, Sprout, ThermometerSnowflake } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="page-footer">
      <span>Plantjes.</span>
      <span>
        Carefully cared for <Leaf size={12} /><CloudSun size={12} /><Cloudy size={12} /><Flower size={12} /><Hourglass size={12} /><LeafyGreen size={12} /><Settings size={12} /><Snowflake size={12} /><Sprout size={12} /><Snowflake size={12} /> <ThermometerSnowflake size={12} />
      </span>
    </footer>
  )
}
