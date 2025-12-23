// electron/renderer/lib/animations.js
// Professional animation system using GSAP

/**
 * SPRING ANIMATION PRESETS
 * Based on Apple's spring animations
 */
export const SpringPresets = {
  // Gentle bounce - for subtle interactions
  gentle: {
    duration: 0.6,
    ease: 'power2.out'
  },

  // Bouncy - for playful interactions (default iOS)
  bouncy: {
    duration: 0.8,
    ease: 'back.out(1.7)'
  },

  // Snappy - for quick responses
  snappy: {
    duration: 0.4,
    ease: 'power3.out'
  },

  // Smooth - for large movements
  smooth: {
    duration: 1.0,
    ease: 'power2.inOut'
  },

  // Elastic - for emphasis
  elastic: {
    duration: 1.2,
    ease: 'elastic.out(1, 0.5)'
  }
};

/**
 * ANIMATION UTILITIES
 */
export class Animator {
  constructor() {
    this.activeAnimations = new Map();
  }

  /**
   * Animate element with spring physics
   */
  spring(element, properties, preset = 'bouncy') {
    const config = SpringPresets[preset] || SpringPresets.bouncy;
    
    // Kill existing animations on this element
    if (this.activeAnimations.has(element)) {
      this.activeAnimations.get(element).kill();
    }

    const animation = gsap.to(element, {
      ...properties,
      ...config
    });

    this.activeAnimations.set(element, animation);
    return animation;
  }

  /**
   * Fade in element
   */
  fadeIn(element, duration = 0.3, delay = 0) {
    return gsap.fromTo(
      element,
      { opacity: 0, y: -10 },
      {
        opacity: 1,
        y: 0,
        duration,
        delay,
        ease: 'power2.out'
      }
    );
  }

  /**
   * Fade out element
   */
  fadeOut(element, duration = 0.3) {
    return gsap.to(element, {
      opacity: 0,
      y: 10,
      duration,
      ease: 'power2.in'
    });
  }

  /**
   * Scale pulse animation
   */
  pulse(element, scale = 1.05, duration = 0.6) {
    return gsap.to(element, {
      scale,
      duration: duration / 2,
      yoyo: true,
      repeat: 1,
      ease: 'power2.inOut'
    });
  }

  /**
   * Morph island size (main animation)
   */
  morphIsland(element, { width, height }, preset = 'bouncy') {
    const config = SpringPresets[preset];
    
    return gsap.to(element, {
      width,
      height,
      ...config,
      onUpdate: () => {
        // Trigger reflow for smooth rendering
        element.offsetHeight;
      }
    });
  }

  /**
   * Stagger animation for multiple elements
   */
  stagger(elements, properties, staggerDelay = 0.1) {
    return gsap.to(elements, {
      ...properties,
      stagger: staggerDelay,
      ease: 'power2.out'
    });
  }

  /**
   * Timeline for complex sequences
   */
  createTimeline(config = {}) {
    return gsap.timeline(config);
  }

  /**
   * Kill all animations
   */
  killAll() {
    this.activeAnimations.forEach(anim => anim.kill());
    this.activeAnimations.clear();
  }

  /**
   * Kill specific element animations
   */
  kill(element) {
    if (this.activeAnimations.has(element)) {
      this.activeAnimations.get(element).kill();
      this.activeAnimations.delete(element);
    }
  }
}

/**
 * CHARGING ANIMATION
 * Special animation for battery charging indicator
 */
export function createChargingAnimation(element) {
  const tl = gsap.timeline({ repeat: -1 });
  
  tl.to(element, {
    opacity: 1,
    scale: 1.1,
    duration: 0.8,
    ease: 'power2.inOut'
  })
  .to(element, {
    opacity: 0.6,
    scale: 1,
    duration: 0.8,
    ease: 'power2.inOut'
  });

  return tl;
}

/**
 * PROGRESS BAR ANIMATION
 * Smooth progress fill with spring
 */
export function animateProgress(element, progress, duration = 0.5) {
  return gsap.to(element, {
    width: `${progress}%`,
    duration,
    ease: 'power2.out'
  });
}

/**
 * NOTIFICATION SLIDE IN
 * Slide notification from top
 */
export function slideInNotification(element) {
  const tl = gsap.timeline();
  
  tl.fromTo(
    element,
    { y: -100, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
  );

  return tl;
}

/**
 * BLUR TRANSITION
 * Animate backdrop blur (expensive, use sparingly)
 */
export function animateBlur(element, fromBlur, toBlur, duration = 0.4) {
  return gsap.fromTo(
    element,
    { backdropFilter: `blur(${fromBlur}px)` },
    {
      backdropFilter: `blur(${toBlur}px)`,
      duration,
      ease: 'power2.inOut'
    }
  );
}

/**
 * HAPTIC FEEDBACK SIMULATION
 * Visual feedback for interactions
 */
export function hapticFeedback(element, intensity = 'medium') {
  const scales = {
    light: { scale: 0.98, duration: 0.1 },
    medium: { scale: 0.95, duration: 0.15 },
    heavy: { scale: 0.92, duration: 0.2 }
  };

  const config = scales[intensity] || scales.medium;

  return gsap.to(element, {
    scale: config.scale,
    duration: config.duration,
    yoyo: true,
    repeat: 1,
    ease: 'power2.inOut'
  });
}

// Export singleton instance
export const animator = new Animator();
