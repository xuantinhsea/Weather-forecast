/**
 * Chart.js registration, done once. Only the pieces the two charts actually use
 * are pulled in — registering everything drags the whole library into the
 * bundle for no benefit.
 */
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
} from 'chart.js'

Chart.register(
  BarController, BarElement,
  LineController, LineElement, PointElement,
  CategoryScale, LinearScale,
  Tooltip, Filler,
)

// The reader can ask the OS to stop animating; charts must honour that too.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  Chart.defaults.animation = false
}

export { Chart }
