import { readJSON, writeJSON } from '../utils/file-helper.js'
import { info } from '../utils/logger.js'
import { runStep0 } from './step0-research.js'
import { runStep1 } from './step1-script.js'
import { runStep2 } from './step2-code.js'
import { runStep3 } from './step3-snapshot.js'
import { runStep4 } from './step4-render.js'
import { runStep5 } from './step5-narration.js'
import { runStep6 } from './step6-tts.js'
import { runTimelineStep } from './step-timeline.js'
import { runStep7 } from './step7-mux.js'
import { runStepSubtitle } from './step-subtitle.js'

let broadcast = null
export function setBroadcaster(fn) { broadcast = fn }

const DATA_PATH = 'data/episodes.json'

const stepOrder = ['research', 'script', 'narration', 'tts', 'timeline', 'subtitle', 'code', 'snapshot', 'render', 'mux']

function updateEpisode(slug, updater) {
  const episodes = readJSON(DATA_PATH) || []
  const idx = episodes.findIndex((e) => e.slug === slug)
  if (idx === -1) return null
  updater(episodes[idx])
  episodes[idx].updatedAt = new Date().toISOString()
  writeJSON(DATA_PATH, episodes)
  if (broadcast) broadcast(slug, episodes[idx])
  return episodes[idx]
}

function getStepIndex(stepName) {
  return stepOrder.indexOf(stepName)
}

function shouldRun(stepName, startIdx, stopIdx) {
  const idx = getStepIndex(stepName)
  return idx >= startIdx && idx <= stopIdx
}

export async function startPipeline(episode, startFrom, options = {}) {
  const slug = episode.slug
  const fps = parseInt(process.env.RENDER_FPS) || 30
  const startIdx = startFrom ? getStepIndex(startFrom) : 0
  const stopIdx = options.stopAfter ? getStepIndex(options.stopAfter) : stepOrder.length - 1

  if (startIdx === -1) {
    updateEpisode(slug, (ep) => {
      ep.status = 'failed'
      ep.error = `Unknown pipeline step: ${startFrom}`
    })
    return
  }
  if (stopIdx === -1) {
    updateEpisode(slug, (ep) => {
      ep.status = 'failed'
      ep.error = `Unknown pipeline stop step: ${options.stopAfter}`
    })
    return
  }

  info(`[Pipeline] Starting for "${episode.title}" (${slug})${startFrom ? ` from step: ${startFrom}` : ''}`)

  updateEpisode(slug, (ep) => {
    ep.status = 'running'
    ep.error = null
    for (let i = startIdx; i <= stopIdx; i++) {
      ep.steps[stepOrder[i]] = 'pending'
    }
    if (startIdx <= getStepIndex('code') && stopIdx >= getStepIndex('code')) {
      ep.codeFallback = null
    }
  })

  if (shouldRun('research', startIdx, stopIdx)) {
    updateEpisode(slug, (ep) => { ep.steps.research = 'running' })
    const r = await runStep0(episode)
    if (!r.success) {
      updateEpisode(slug, (ep) => {
        ep.steps.research = 'failed'
        ep.status = 'failed'
        ep.error = r.error
      })
      return
    }
    updateEpisode(slug, (ep) => {
      ep.steps.research = 'completed'
      ep.researchContent = r.content
      if (stopIdx === getStepIndex('research')) ep.status = 'research_completed'
    })
  }

  if (shouldRun('script', startIdx, stopIdx)) {
    updateEpisode(slug, (ep) => { ep.steps.script = 'running' })
    const r = await runStep1(episode)
    if (!r.success) {
      updateEpisode(slug, (ep) => {
        ep.steps.script = 'failed'
        ep.status = 'failed'
        ep.error = r.error
      })
      return
    }
    updateEpisode(slug, (ep) => {
      ep.steps.script = 'completed'
      ep.scriptContent = r.content
      if (r.storyboardContent) ep.storyboardContent = r.storyboardContent
      if (stopIdx === getStepIndex('script')) ep.status = 'storyboard_ready'
    })
  }

  if (shouldRun('narration', startIdx, stopIdx)) {
    updateEpisode(slug, (ep) => { ep.steps.narration = 'running' })
    const r = await runStep5(episode)
    if (!r.success) {
      updateEpisode(slug, (ep) => {
        ep.steps.narration = 'failed'
        ep.status = 'failed'
        ep.error = r.error
      })
      return
    }
    updateEpisode(slug, (ep) => {
      ep.steps.narration = 'completed'
      if (r.segments) ep.narrationSegments = r.segments
    })
  }

  if (shouldRun('tts', startIdx, stopIdx)) {
    updateEpisode(slug, (ep) => { ep.steps.tts = 'running' })
    const r = await runStep6(episode)
    if (!r.success) {
      updateEpisode(slug, (ep) => {
        ep.steps.tts = 'failed'
        ep.status = 'failed'
        ep.error = r.error
      })
      return
    }
    updateEpisode(slug, (ep) => {
      ep.steps.tts = 'completed'
      if (r.segments) ep.ttsSegments = r.segments
    })
  }

  if (shouldRun('timeline', startIdx, stopIdx)) {
    updateEpisode(slug, (ep) => { ep.steps.timeline = 'running' })
    const r = await runTimelineStep(episode)
    if (!r.success) {
      updateEpisode(slug, (ep) => {
        ep.steps.timeline = 'failed'
        ep.status = 'failed'
        ep.error = r.error
      })
      return
    }
    updateEpisode(slug, (ep) => {
      ep.steps.timeline = 'completed'
      ep.timelineContent = r.timeline
      ep.timelineWarnings = r.warnings || []
    })
  }

  if (shouldRun('code', startIdx, stopIdx)) {
    updateEpisode(slug, (ep) => { ep.steps.code = 'running' })
    const r = await runStep2(episode)
    if (!r.success) {
      updateEpisode(slug, (ep) => {
        ep.steps.code = 'failed'
        ep.status = 'failed'
        ep.error = r.error
      })
      return
    }
    updateEpisode(slug, (ep) => {
      ep.steps.code = 'completed'
      if (r.codeContent) ep.codeContent = r.codeContent
      if (r.codePlan) ep.codePlanContent = r.codePlan
      ep.codeFallback = r.fallback
        ? {
            used: true,
            reason: r.fallbackReason || 'AI code generation failed; local fallback was used.',
            at: new Date().toISOString(),
          }
        : null
    })
  }

  if (shouldRun('snapshot', startIdx, stopIdx) || shouldRun('render', startIdx, stopIdx)) {
    updateEpisode(slug, (ep) => {
      if (shouldRun('snapshot', startIdx, stopIdx)) ep.steps.snapshot = 'running'
      if (shouldRun('render', startIdx, stopIdx)) ep.steps.render = 'running'
    })

    const promises = [
      shouldRun('snapshot', startIdx, stopIdx) ? runStep3(episode) : Promise.resolve({ success: true, skip: true }),
      shouldRun('render', startIdx, stopIdx) ? runStep4(episode, fps) : Promise.resolve({ success: true, skip: true }),
    ]

    const [s3, s4] = await Promise.all(promises)

    updateEpisode(slug, (ep) => {
      if (shouldRun('snapshot', startIdx, stopIdx)) ep.steps.snapshot = s3.success ? 'completed' : 'failed'
      if (shouldRun('render', startIdx, stopIdx)) ep.steps.render = s4.success ? 'completed' : 'failed'
    })

    if (!s3.success || !s4.success) {
      updateEpisode(slug, (ep) => {
        ep.status = 'failed'
        ep.error = [s3.error, s4.error].filter(Boolean).join('; ')
      })
      return
    }
  }

  if (shouldRun('subtitle', startIdx, stopIdx)) {
    updateEpisode(slug, (ep) => { ep.steps.subtitle = 'running' })
    const r = await runStepSubtitle(episode)
    if (!r.success) {
      updateEpisode(slug, (ep) => {
        ep.steps.subtitle = 'failed'
        ep.status = 'failed'
        ep.error = r.error
      })
      return
    }
    updateEpisode(slug, (ep) => {
      ep.steps.subtitle = 'completed'
    })
  }

  if (shouldRun('mux', startIdx, stopIdx)) {
    updateEpisode(slug, (ep) => { ep.steps.mux = 'running' })
    const r = await runStep7(episode)
    updateEpisode(slug, (ep) => {
      ep.steps.mux = r.success ? 'completed' : 'failed'
      ep.status = r.success ? 'completed' : 'failed'
      if (!r.success) ep.error = r.error
    })
  } else if (stopIdx > getStepIndex('research') && stopIdx !== getStepIndex('script')) {
    updateEpisode(slug, (ep) => {
      ep.status = 'completed'
    })
  }

  info(`[Pipeline] Completed for "${episode.title}"`)
}

export { stepOrder }
