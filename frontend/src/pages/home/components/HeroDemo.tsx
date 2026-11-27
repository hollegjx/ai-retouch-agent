/**
 * 首页演示窗：一段 12 秒循环的纯 CSS 动画，演示「对话 → 点选主体 → 换背景 → 加文字图层」。
 * 只用于展示，不可交互，读屏跳过。
 */
export default function HeroDemo() {
  return (
    <div className="hero-stage" aria-hidden>
      <div className="hero-window">
        <div className="hw-chrome">
          <i />
          <i />
          <i />
          <span>日常器物 · 新品系列</span>
        </div>

        <div className="hw-chat">
          <p className="text-faint mb-1 text-[11px] font-medium">AI 对话</p>
          <div className="hw-bubble me hw-b1">去掉背景，换成深色</div>
          <div className="hw-bubble ai hw-b2">好的，分两步：抠出主体，再生成深色背景。</div>
          <div className="hw-bubble me hw-b3">再加一行标题</div>
          <div className="hw-bubble ai hw-b4">已新增文字图层，可在右侧继续调整。</div>
        </div>

        <div className="hw-canvas">
          <div className="hw-backdrop" />
          <p className="hw-headline">日常器物</p>
          <div className="hw-product">
            <svg viewBox="0 0 180 240" className="size-full">
              <ellipse cx="90" cy="226" rx="52" ry="7" fill="#000" opacity="0.14" />
              <rect x="44" y="72" width="92" height="152" rx="26" fill="#fbfbfd" />
              <rect x="96" y="72" width="40" height="152" rx="20" fill="#f0f0f3" />
              <rect x="72" y="44" width="36" height="36" rx="8" fill="#f2f2f5" />
              <rect
                x="66"
                y="18"
                width="48"
                height="30"
                rx="9"
                fill="#1d1d1f"
                stroke="#fff"
                strokeOpacity="0.22"
              />
              <rect
                x="60"
                y="118"
                width="60"
                height="58"
                rx="8"
                fill="#1d1d1f"
                stroke="#fff"
                strokeOpacity="0.22"
              />
              <rect x="70" y="132" width="30" height="4" rx="2" fill="#fff" />
              <rect x="70" y="142" width="40" height="3" rx="1.5" fill="#86868b" />
              <rect x="70" y="150" width="24" height="3" rx="1.5" fill="#86868b" />
            </svg>
            <svg className="hw-marquee" viewBox="0 0 208 268" preserveAspectRatio="none">
              <rect
                x="2"
                y="2"
                width="204"
                height="264"
                rx="18"
                fill="none"
                stroke="#1d1d1f"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
            </svg>
          </div>
          <svg className="hw-cursor" viewBox="0 0 18 18">
            <path
              d="M3 1.5v13l3.6-3.3 2.5 5.3 2.3-1.1-2.5-5.2h4.9L3 1.5Z"
              fill="#1d1d1f"
              stroke="#fff"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
          <div className="hw-toast">背景已替换 · 可撤销</div>
        </div>

        <div className="hw-layers">
          <p>图层</p>
          <div className="hw-layer is-new">
            <i className="hw-text-thumb">T</i>标题文字
          </div>
          <div className="hw-layer is-subject">
            <i />
            主体
          </div>
          <div className="hw-layer is-bg">
            <i />
            背景
          </div>
        </div>
      </div>
    </div>
  )
}
