import React, { useEffect, useRef, memo } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  G,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

// Brand Palette — Asmak Al Mohit Organic Wave Identity
const CREAM_BG = '#F9F6EE';
const DEEP_OCEAN_TEAL = '#055055';
const DARK_ABYSS_TEAL = '#03363A';
const MID_OCEAN_TEAL = '#0B7480';
const TURQUOISE_BRIGHT = '#1DB8C8';
const TURQUOISE_DEEP = '#0E91A1';
const MINT_GREEN = '#7FE0DA';
const MINT_SOFT = '#B5EDE6';
const ORANGE_BRIGHT = '#F37324';
const ORANGE_WARM = '#FF9F3E';
const ORANGE_DEEP = '#DC5910';

const ASMAK_LOGO_SOURCE = require('../../assets/asmak-logo-circle.png');

interface AnimatedSplashScreenProps {
  onFinish: () => void;
  logoUrl?: string | null;
}

const AnimatedSplashScreenComponent: React.FC<AnimatedSplashScreenProps> = ({
  onFinish,
}) => {
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Match mobile shell proportions on wide desktop web while filling 100% on phones
  const isWideWeb = Platform.OS === 'web' && windowWidth > 540;
  const shellWidth = isWideWeb ? 460 : Math.max(320, windowWidth);
  const shellHeight = Math.max(620, windowHeight);

  // Horizontal bleed ensures parallax wave motion never exposes a straight SVG edge
  const svgBleedX = 36;
  const svgWidth = shellWidth + svgBleedX * 2;
  const svgHeight = shellHeight + 80;

  // Responsive sizing for official Logo
  const logoSize = Math.min(Math.round(shellWidth * 0.39), 162);

  // ── Shared Values (60fps UI-Thread Reanimated) ──────────────────────────
  const screenOpacity = useSharedValue(1);

  // Phase 1 (0ms – 200ms+): Top Turquoise Canopy Wave Reveal
  const topWaveY = useSharedValue(-190);
  const topWaveOpacity = useSharedValue(0);
  const topWaveDriftX = useSharedValue(0);
  const topWaveDriftY = useSharedValue(0);

  // Phase 2 (150ms – 500ms): Multi-layer Parallax Ocean & Orange Ribbons
  const topOrangeX = useSharedValue(95);
  const topOrangeY = useSharedValue(-65);
  const topOrangeOpacity = useSharedValue(0);
  const topOrangeDriftX = useSharedValue(0);

  const midCurlX = useSharedValue(80);
  const midCurlOpacity = useSharedValue(0);
  const midCurlDriftY = useSharedValue(0);

  const sWaveTurquoiseX = useSharedValue(70);
  const sWaveTurquoiseY = useSharedValue(95);
  const sWaveTurquoiseOpacity = useSharedValue(0);
  const sWaveTurquoiseDriftX = useSharedValue(0);
  const sWaveTurquoiseDriftY = useSharedValue(0);

  const sRibbonOrangeX = useSharedValue(-75);
  const sRibbonOrangeY = useSharedValue(80);
  const sRibbonOrangeOpacity = useSharedValue(0);
  const sRibbonOrangeDriftX = useSharedValue(0);
  const sRibbonOrangeDriftY = useSharedValue(0);

  const bottomWaveY = useSharedValue(210);
  const bottomWaveOpacity = useSharedValue(0);
  const bottomWaveDriftX = useSharedValue(0);

  const dropletsOpacity = useSharedValue(0);
  const dropletsDriftY = useSharedValue(0);

  // Official Asmak Al Mohit Logo Reveal
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.88);
  const logoTranslateY = useSharedValue(-14);

  useEffect(() => {
    const smoothOut = Easing.bezier(0.22, 1, 0.36, 1);
    const liquidSine = Easing.inOut(Easing.sin);

    // ── PHASE 1: Background & First Top Turquoise Wave (0ms – 200ms+) ──
    topWaveOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
    topWaveY.value = withTiming(0, { duration: 380, easing: smoothOut });
    topWaveDriftX.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(8, { duration: 1400, easing: liquidSine }),
          withTiming(-8, { duration: 1400, easing: liquidSine })
        ),
        -1,
        true
      )
    );
    topWaveDriftY.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(5, { duration: 1200, easing: liquidSine }),
          withTiming(-3, { duration: 1200, easing: liquidSine })
        ),
        -1,
        true
      )
    );

    // ── PHASE 2: Additional Parallax Wave Layers & Orange Ribbons (150ms – 500ms) ──
    // 2a. Top-Right Orange Accent Ribbon
    topOrangeOpacity.value = withDelay(150, withTiming(1, { duration: 260, easing: smoothOut }));
    topOrangeX.value = withDelay(150, withTiming(0, { duration: 350, easing: smoothOut }));
    topOrangeY.value = withDelay(150, withTiming(0, { duration: 350, easing: smoothOut }));
    topOrangeDriftX.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(-9, { duration: 1500, easing: liquidSine }),
          withTiming(7, { duration: 1500, easing: liquidSine })
        ),
        -1,
        true
      )
    );

    // 2b. Bottom Deep Ocean Teal Anchor Wave
    bottomWaveOpacity.value = withDelay(150, withTiming(1, { duration: 260, easing: smoothOut }));
    bottomWaveY.value = withDelay(150, withTiming(0, { duration: 360, easing: smoothOut }));
    bottomWaveDriftX.value = withDelay(
      520,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 1650, easing: liquidSine }),
          withTiming(10, { duration: 1650, easing: liquidSine })
        ),
        -1,
        true
      )
    );

    // 2c. Main Intertwined Turquoise & Mint S-Curve Wave
    sWaveTurquoiseOpacity.value = withDelay(180, withTiming(1, { duration: 280, easing: smoothOut }));
    sWaveTurquoiseX.value = withDelay(180, withTiming(0, { duration: 340, easing: smoothOut }));
    sWaveTurquoiseY.value = withDelay(180, withTiming(0, { duration: 340, easing: smoothOut }));
    sWaveTurquoiseDriftX.value = withDelay(
      520,
      withRepeat(
        withSequence(
          withTiming(9, { duration: 1350, easing: liquidSine }),
          withTiming(-9, { duration: 1350, easing: liquidSine })
        ),
        -1,
        true
      )
    );
    sWaveTurquoiseDriftY.value = withDelay(
      520,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 1450, easing: liquidSine }),
          withTiming(6, { duration: 1450, easing: liquidSine })
        ),
        -1,
        true
      )
    );

    // 2d. Flowing Orange S-Ribbon Following the Main Wave
    sRibbonOrangeOpacity.value = withDelay(220, withTiming(1, { duration: 280, easing: smoothOut }));
    sRibbonOrangeX.value = withDelay(220, withTiming(0, { duration: 340, easing: smoothOut }));
    sRibbonOrangeY.value = withDelay(220, withTiming(0, { duration: 340, easing: smoothOut }));
    sRibbonOrangeDriftX.value = withDelay(
      560,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 1280, easing: liquidSine }),
          withTiming(8, { duration: 1280, easing: liquidSine })
        ),
        -1,
        true
      )
    );
    sRibbonOrangeDriftY.value = withDelay(
      560,
      withRepeat(
        withSequence(
          withTiming(5, { duration: 1380, easing: liquidSine }),
          withTiming(-5, { duration: 1380, easing: liquidSine })
        ),
        -1,
        true
      )
    );

    // 2e. Mid-Right Mint/Turquoise Curl + Ambient Droplets
    midCurlOpacity.value = withDelay(240, withTiming(1, { duration: 260, easing: smoothOut }));
    midCurlX.value = withDelay(240, withTiming(0, { duration: 320, easing: smoothOut }));
    midCurlDriftY.value = withDelay(
      560,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 1300, easing: liquidSine }),
          withTiming(6, { duration: 1300, easing: liquidSine })
        ),
        -1,
        true
      )
    );

    dropletsOpacity.value = withDelay(340, withTiming(1, { duration: 360, easing: smoothOut }));
    dropletsDriftY.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 1400, easing: liquidSine }),
          withTiming(5, { duration: 1400, easing: liquidSine })
        ),
        -1,
        true
      )
    );

    // ── Official Asmak Al Mohit Logo Reveal ──
    logoOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 350, easing: smoothOut })
    );
    logoScale.value = withDelay(
      500,
      withSpring(1, {
        damping: 16,
        stiffness: 155,
        mass: 0.85,
      })
    );
    logoTranslateY.value = withDelay(
      500,
      withTiming(0, { duration: 350, easing: smoothOut })
    );

    // ── PHASE 5: Final Composition Settles & Smooth Exit Transition (~2000ms) ──
    const fadeOutTimer = setTimeout(() => {
      screenOpacity.value = withTiming(0, {
        duration: 220,
        easing: Easing.inOut(Easing.quad),
      });
    }, 1920);

    const finishTimer = setTimeout(() => {
      onFinishRef.current();
    }, 2150);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(finishTimer);
      cancelAnimation(screenOpacity);
      cancelAnimation(topWaveY);
      cancelAnimation(topWaveOpacity);
      cancelAnimation(topWaveDriftX);
      cancelAnimation(topWaveDriftY);
      cancelAnimation(topOrangeX);
      cancelAnimation(topOrangeY);
      cancelAnimation(topOrangeOpacity);
      cancelAnimation(topOrangeDriftX);
      cancelAnimation(midCurlX);
      cancelAnimation(midCurlOpacity);
      cancelAnimation(midCurlDriftY);
      cancelAnimation(sWaveTurquoiseX);
      cancelAnimation(sWaveTurquoiseY);
      cancelAnimation(sWaveTurquoiseOpacity);
      cancelAnimation(sWaveTurquoiseDriftX);
      cancelAnimation(sWaveTurquoiseDriftY);
      cancelAnimation(sRibbonOrangeX);
      cancelAnimation(sRibbonOrangeY);
      cancelAnimation(sRibbonOrangeOpacity);
      cancelAnimation(sRibbonOrangeDriftX);
      cancelAnimation(sRibbonOrangeDriftY);
      cancelAnimation(bottomWaveY);
      cancelAnimation(bottomWaveOpacity);
      cancelAnimation(bottomWaveDriftX);
      cancelAnimation(dropletsOpacity);
      cancelAnimation(dropletsDriftY);
      cancelAnimation(logoOpacity);
      cancelAnimation(logoScale);
      cancelAnimation(logoTranslateY);
    };
  }, []);

  // ── Animated Styles ─────────────────────────────────────────────────────
  const rootAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const topWaveStyle = useAnimatedStyle(() => ({
    opacity: topWaveOpacity.value,
    transform: [
      { translateX: topWaveDriftX.value },
      { translateY: topWaveY.value + topWaveDriftY.value },
    ],
  }));

  const topOrangeRibbonStyle = useAnimatedStyle(() => ({
    opacity: topOrangeOpacity.value,
    transform: [
      { translateX: topOrangeX.value + topOrangeDriftX.value },
      { translateY: topOrangeY.value },
    ],
  }));

  const midCurlStyle = useAnimatedStyle(() => ({
    opacity: midCurlOpacity.value,
    transform: [
      { translateX: midCurlX.value },
      { translateY: midCurlDriftY.value },
    ],
  }));

  const sWaveTurquoiseStyle = useAnimatedStyle(() => ({
    opacity: sWaveTurquoiseOpacity.value,
    transform: [
      { translateX: sWaveTurquoiseX.value + sWaveTurquoiseDriftX.value },
      { translateY: sWaveTurquoiseY.value + sWaveTurquoiseDriftY.value },
    ],
  }));

  const sRibbonOrangeStyle = useAnimatedStyle(() => ({
    opacity: sRibbonOrangeOpacity.value,
    transform: [
      { translateX: sRibbonOrangeX.value + sRibbonOrangeDriftX.value },
      { translateY: sRibbonOrangeY.value + sRibbonOrangeDriftY.value },
    ],
  }));

  const bottomWaveStyle = useAnimatedStyle(() => ({
    opacity: bottomWaveOpacity.value,
    transform: [
      { translateX: bottomWaveDriftX.value },
      { translateY: bottomWaveY.value },
    ],
  }));

  const dropletsStyle = useAnimatedStyle(() => ({
    opacity: dropletsOpacity.value,
    transform: [{ translateY: dropletsDriftY.value }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { translateY: logoTranslateY.value },
      { scale: logoScale.value },
    ],
  }));

  const svgLayerFrame = {
    position: 'absolute' as const,
    top: -40,
    left: -svgBleedX,
    width: svgWidth,
    height: svgHeight,
  };

  return (
    <Animated.View style={[styles.outerBackdrop, rootAnimatedStyle]}>
      <StatusBar style="dark" />

      <View
        style={[
          styles.splashShell,
          isWideWeb && styles.splashShellDesktop,
        ]}
      >
        {/* ── MULTI-LAYER PARALLAX OCEAN WAVES (SVG + Reanimated) ── */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {/* Layer 2A: Top-Right Flowing Orange Accent Ribbon (Behind Top Turquoise Canopy) */}
          <Animated.View style={[svgLayerFrame, topOrangeRibbonStyle]}>
            <Svg
              width={svgWidth}
              height={svgHeight}
              viewBox="-36 -40 472 940"
              preserveAspectRatio="none"
            >
              <Defs>
                <LinearGradient id="topOrangeGrad" x1="0%" y1="0%" x2="100%" y2="50%">
                  <Stop offset="0%" stopColor={ORANGE_WARM} />
                  <Stop offset="55%" stopColor={ORANGE_BRIGHT} />
                  <Stop offset="100%" stopColor={ORANGE_DEEP} />
                </LinearGradient>
              </Defs>
              {/* Soft Warm Apricot Glow */}
              <Path
                d="M 156,92 C 252,58 352,66 446,126 L 446,150 C 350,90 256,78 156,92 Z"
                fill="#FAD8B4"
                opacity={0.48}
              />
              {/* Vibrant Top-Right Orange Ribbon */}
              <Path
                d="M 126,86 C 228,28 338,14 446,66 L 446,126 C 350,68 248,58 126,86 Z"
                fill="url(#topOrangeGrad)"
              />
            </Svg>
          </Animated.View>

          {/* Layer 1: Top Turquoise & Deep Ocean Teal Canopy Wave (Phase 1 Lead Wave) */}
          <Animated.View style={[svgLayerFrame, topWaveStyle]}>
            <Svg
              width={svgWidth}
              height={svgHeight}
              viewBox="-36 -40 472 940"
              preserveAspectRatio="none"
            >
              <Defs>
                <LinearGradient id="topCanopyGrad" x1="0%" y1="0%" x2="100%" y2="80%">
                  <Stop offset="0%" stopColor="#26C6D6" />
                  <Stop offset="55%" stopColor={TURQUOISE_DEEP} />
                  <Stop offset="100%" stopColor={DEEP_OCEAN_TEAL} />
                </LinearGradient>
              </Defs>
              {/* Soft Mint-Aqua Rim Under Left Fold */}
              <Path
                d="M -46,138 C 44,170 138,130 232,68 C 146,140 48,184 -46,158 Z"
                fill={MINT_SOFT}
                opacity={0.7}
              />
              {/* Main Turquoise Ocean Canopy */}
              <Path
                d="M -46,-50 L 446,-50 L 446,64 C 344,14 246,38 158,92 C 82,138 14,150 -46,122 Z"
                fill="url(#topCanopyGrad)"
              />
              {/* Deep Ocean Teal Inner Ribbon Fold */}
              <Path
                d="M -46,74 C 32,126 122,112 238,44 C 146,116 52,162 -46,142 Z"
                fill={DEEP_OCEAN_TEAL}
              />
            </Svg>
          </Animated.View>

          {/* Layer 2B: Mid-Right Mint & Turquoise Ribbon Loop Embracing Upper Platter */}
          <Animated.View style={[svgLayerFrame, midCurlStyle]}>
            <Svg
              width={svgWidth}
              height={svgHeight}
              viewBox="-36 -40 472 940"
              preserveAspectRatio="none"
            >
              <Path
                d="M 250,368 C 298,292 368,270 446,304 L 446,340 C 372,306 312,322 272,386 Z"
                fill={MINT_GREEN}
              />
              <Path
                d="M 264,378 C 310,308 372,290 446,322 L 446,352 C 376,320 320,336 282,394 Z"
                fill={TURQUOISE_BRIGHT}
              />
            </Svg>
          </Animated.View>

          {/* Layer 2C: Intertwined Center-to-Bottom Turquoise & Mint S-Curve Wave */}
          <Animated.View style={[svgLayerFrame, sWaveTurquoiseStyle]}>
            <Svg
              width={svgWidth}
              height={svgHeight}
              viewBox="-36 -40 472 940"
              preserveAspectRatio="none"
            >
              <Defs>
                <LinearGradient id="sTurquoiseGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#2CD1DF" />
                  <Stop offset="50%" stopColor="#14A4B5" />
                  <Stop offset="100%" stopColor={MID_OCEAN_TEAL} />
                </LinearGradient>
              </Defs>

              {/* Deep Teal Under-Ribbon */}
              <Path
                d="M 304,404 C 388,414 438,468 422,526 C 404,590 292,618 192,652 C 114,678 92,724 142,760 C 190,794 314,776 446,714 L 446,808 C 304,846 134,844 58,784 C -8,732 4,644 110,600 C 214,557 334,536 348,484 C 356,452 332,426 290,416 Z"
                fill="#075E68"
              />

              {/* Luminous Turquoise Intertwined S-Ribbon */}
              <Path
                d="M 316,394 C 398,406 446,458 430,516 C 412,580 298,606 194,640 C 108,668 80,718 132,758 C 182,796 312,780 446,708 L 446,770 C 312,826 158,826 84,772 C 22,726 32,650 130,610 C 230,570 348,546 362,490 C 370,456 346,424 304,410 Z"
                fill="url(#sTurquoiseGrad)"
              />

              {/* Soft Mint-Aqua Inner Crest */}
              <Path
                d="M 130,666 C 194,634 304,608 384,558 C 318,618 208,646 144,680 C 98,704 94,738 134,762 C 86,740 84,690 130,666 Z"
                fill={MINT_GREEN}
                opacity={0.82}
              />
            </Svg>
          </Animated.View>

          {/* Layer 2D: Flowing Bright Orange S-Ribbon Wrapping Around the Platter */}
          <Animated.View style={[svgLayerFrame, sRibbonOrangeStyle]}>
            <Svg
              width={svgWidth}
              height={svgHeight}
              viewBox="-36 -40 472 940"
              preserveAspectRatio="none"
            >
              <Defs>
                <LinearGradient id="sOrangeGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={ORANGE_WARM} />
                  <Stop offset="50%" stopColor={ORANGE_BRIGHT} />
                  <Stop offset="100%" stopColor={ORANGE_DEEP} />
                </LinearGradient>
              </Defs>

              {/* Main Flowing Orange S-Curve Ribbon */}
              <Path
                d="M 298,364 C 382,374 434,424 422,484 C 408,550 290,574 174,610 C 78,640 42,690 74,738 C 102,780 172,796 252,798 C 162,814 64,794 24,740 C -12,690 14,616 124,578 C 232,540 348,520 362,466 C 370,432 342,398 290,384 Z"
                fill="url(#sOrangeGrad)"
              />

              {/* Warm Sunlit Ribbon Highlight */}
              <Path
                d="M 354,460 C 342,514 228,548 128,584 C 38,616 14,680 48,730 C 26,680 54,624 140,592 C 238,556 348,524 354,460 Z"
                fill="#FFD082"
                opacity={0.55}
              />
            </Svg>
          </Animated.View>

          {/* Layer 2E: Final Bottom Flowing Deep Ocean Teal Wave */}
          <Animated.View style={[svgLayerFrame, bottomWaveStyle]}>
            <Svg
              width={svgWidth}
              height={svgHeight}
              viewBox="-36 -40 472 940"
              preserveAspectRatio="none"
            >
              <Defs>
                <LinearGradient id="bottomAbyssGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={MID_OCEAN_TEAL} />
                  <Stop offset="45%" stopColor={DEEP_OCEAN_TEAL} />
                  <Stop offset="100%" stopColor={DARK_ABYSS_TEAL} />
                </LinearGradient>
              </Defs>

              {/* Secondary Mid-Teal Rolling Wave */}
              <Path
                d="M -46,678 C 24,762 122,818 242,796 C 332,780 396,736 446,698 L 446,920 L -46,920 Z"
                fill={MID_OCEAN_TEAL}
                opacity={0.85}
              />

              {/* Foreground Deep Ocean Teal Wave */}
              <Path
                d="M -46,726 C 38,798 152,832 272,806 C 354,788 408,754 446,722 L 446,920 L -46,920 Z"
                fill="url(#bottomAbyssGrad)"
              />
            </Svg>
          </Animated.View>

          {/* Subtle Ambient Ocean & Herb Droplets */}
          <Animated.View style={[svgLayerFrame, dropletsStyle]}>
            <Svg
              width={svgWidth}
              height={svgHeight}
              viewBox="-36 -40 472 940"
              preserveAspectRatio="none"
            >
              <G opacity={0.65}>
                <Circle cx="52" cy="212" r="4" fill={TURQUOISE_BRIGHT} />
                <Circle cx="348" cy="196" r="3.5" fill={ORANGE_BRIGHT} />
                <Path
                  d="M 68,284 C 62,276 66,268 74,272 C 80,276 75,286 68,284 Z"
                  fill={MINT_GREEN}
                />
                <Path
                  d="M 336,262 C 332,254 338,248 344,252 C 349,256 343,265 336,262 Z"
                  fill={TURQUOISE_BRIGHT}
                />
                <Circle cx="188" cy="708" r="4" fill={MINT_GREEN} />
                <Path
                  d="M 222,724 C 218,716 224,710 230,714 C 235,718 229,727 222,724 Z"
                  fill={ORANGE_BRIGHT}
                />
              </G>
            </Svg>
          </Animated.View>
        </View>

        {/* ── FOREGROUND SAFE-AREA COMPOSITION: OFFICIAL LOGO ONLY ── */}
        <SafeAreaView style={styles.safeForeground} edges={['top', 'bottom']}>
          <View
            style={[
              styles.compositionColumn,
              {
                paddingTop: Math.max(12, shellHeight * 0.045 - insets.top * 0.3),
                paddingBottom: Math.max(36, shellHeight * 0.09),
              },
            ]}
          >
            <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
              <View
                style={[
                  styles.logoShadowShell,
                  {
                    width: logoSize,
                    height: logoSize,
                    borderRadius: logoSize / 2,
                  },
                ]}
              >
                <Image
                  source={ASMAK_LOGO_SOURCE}
                  style={{ width: logoSize, height: logoSize }}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>
          </View>
        </SafeAreaView>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerBackdrop: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: CREAM_BG,
  },
  splashShell: {
    flex: 1,
    width: '100%',
    backgroundColor: CREAM_BG,
    position: 'relative',
    overflow: 'hidden',
  },
  splashShellDesktop: {
    maxWidth: 460,
    alignSelf: 'center',
    shadowColor: '#053B3F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 8,
  },
  safeForeground: {
    flex: 1,
    zIndex: 10,
  },
  compositionColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoShadowShell: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#04383C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 5,
  },
});

export const AnimatedSplashScreen = memo(AnimatedSplashScreenComponent);
export default AnimatedSplashScreen;
