import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";

import { Scene1_Intro } from "./scenes/Scene1_Intro";
import { Scene2_WidgetSetup } from "./scenes/Scene2_WidgetSetup";
import { Scene3_Checkout } from "./scenes/Scene3_Checkout";
import { Scene4_OrderLog } from "./scenes/Scene4_OrderLog";
import { Scene5_DualMode } from "./scenes/Scene5_DualMode";
import { Scene6_BuyerRelease } from "./scenes/Scene6_BuyerRelease";
import { Scene7_EndCard } from "./scenes/Scene7_EndCard";

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <TransitionSeries>
        {/* Scene 1: Logo intro — 4.5s */}
        <TransitionSeries.Sequence durationInFrames={135}>
          <Scene1_Intro />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Scene 2: Widget setup — 6s */}
        <TransitionSeries.Sequence durationInFrames={180}>
          <Scene2_WidgetSetup />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Scene 3: Checkout on Jumia — 7s */}
        <TransitionSeries.Sequence durationInFrames={210}>
          <Scene3_Checkout />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Scene 4: Work order log — 7s */}
        <TransitionSeries.Sequence durationInFrames={210}>
          <Scene4_OrderLog />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Scene 5: Dual mode close-up — 5s */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene5_DualMode />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Scene 6: Buyer release — 8s */}
        <TransitionSeries.Sequence durationInFrames={240}>
          <Scene6_BuyerRelease />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 25 })}
        />

        {/* Scene 7: End card — 4s */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene7_EndCard />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
