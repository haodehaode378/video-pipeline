import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PipelineTimeline from './PipelineTimeline'

const labels = ['资料收集', '生成分镜', '生成旁白', '生成 TTS', '校准时间轴', '生成 HTML', '预览截图', '渲染视频', '合成成片']

describe('PipelineTimeline', () => {
  it('renders all 9 step labels', () => {
    render(<PipelineTimeline currentStep={1} />)
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy()
    })
  })

  it('shows checkmark for completed steps', () => {
    render(<PipelineTimeline currentStep={5} />)
    // Steps 1-4 should show ✓
    const checks = screen.getAllByText('✓')
    expect(checks.length).toBeGreaterThanOrEqual(3)
  })

  it('shows failed styling when failed=true', () => {
    const { container } = render(<PipelineTimeline currentStep={3} failed={true} />)
    expect(container.querySelector('[class*="bg-red-500/20"]')).toBeTruthy()
    // The failed step shows ! instead of step number
    expect(screen.getByText('!')).toBeTruthy()
  })

  it('shows step numbers for pending steps', () => {
    render(<PipelineTimeline currentStep={1} />)
    // All steps except step 1 show their number; step 1 is active
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('9')).toBeTruthy()
  })

  it('renders connector lines between steps', () => {
    const { container } = render(<PipelineTimeline currentStep={1} />)
    // There should be w-4 h-px connector elements
    expect(container.querySelectorAll('.h-px').length).toBeGreaterThanOrEqual(8)
  })
})
