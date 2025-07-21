import { useRef, useState, useEffect } from "react";
import Matter from "matter-js";
import "./FallingText.css";

const FallingText = ({
  text = '',
  highlightWords = [],
  highlightClass = "highlighted",
  trigger = "auto",
  backgroundColor = "transparent",
  wireframes = false,
  gravity = 1,
  mouseConstraintStiffness = 0.2,
  fontSize = "1rem"
}) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const canvasContainerRef = useRef(null);

  const [effectStarted, setEffectStarted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log("Text content:", text);
    console.log("Highlight words:", highlightWords);
  }, [text, highlightWords]);

  // Initialize the text display
  useEffect(() => {
    if (!textRef.current) return;
    
    console.log("Setting up text display");
    
    // Display all words with proper highlighting
    const words = text.split(" ");
    const newHTML = words
      .map((word) => {
        // Check if this word should be highlighted
        const isHighlighted = highlightWords.some((hw) => 
          word.toLowerCase() === hw.toLowerCase()
        );
        return `<span class="word ${isHighlighted ? highlightClass : ""}">${word}</span>`;
      })
      .join(" ");
    
    textRef.current.innerHTML = newHTML;
    
    // Mark as initialized after text is set
    setIsInitialized(true);
    
    console.log("Text HTML set:", newHTML);
  }, [text, highlightWords, highlightClass]);

  // Determine when to start the effect
  useEffect(() => {
    if (!isInitialized) return;
    
    if (trigger === "auto") {
      console.log("Auto-starting effect");
      setEffectStarted(true);
      return;
    }
    
    if (trigger === "scroll" && containerRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            console.log("Scroll trigger activated");
            setEffectStarted(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [trigger, isInitialized]);

  // Matter.js physics setup
  useEffect(() => {
    if (!effectStarted || !isInitialized) return;
    
    console.log("Starting physics effect");

    const {
      Engine,
      Render,
      World,
      Bodies,
      Runner,
      Mouse,
      MouseConstraint,
    } = Matter;

    if (!containerRef.current) {
      console.error("Container ref not available");
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    console.log("Container dimensions:", { width, height });

    if (width <= 0 || height <= 0) {
      console.error("Container has zero width or height!");
      return;
    }

    // Create physics engine
    const engine = Engine.create();
    engine.world.gravity.y = gravity;

    // Setup renderer
    const render = Render.create({
      element: canvasContainerRef.current,
      engine,
      options: {
        width,
        height,
        background: backgroundColor,
        wireframes,
      },
    });

    // Create boundaries
    const boundaryOptions = {
      isStatic: true,
      render: { fillStyle: "transparent" },
    };
    
    const floor = Bodies.rectangle(width / 2, height + 25, width, 50, boundaryOptions);
    const leftWall = Bodies.rectangle(-25, height / 2, 50, height, boundaryOptions);
    const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height, boundaryOptions);
    const ceiling = Bodies.rectangle(width / 2, -25, width, 50, boundaryOptions);

    // Get all word elements and create physics bodies for them
    const wordSpans = textRef.current.querySelectorAll(".word");
    console.log("Found word spans:", wordSpans.length);
    
    const wordBodies = [...wordSpans].map((elem) => {
      const rect = elem.getBoundingClientRect();
      
      // Position relative to container
      const x = rect.left - containerRect.left + rect.width / 2;
      const y = rect.top - containerRect.top + rect.height / 2;
      
      console.log(`Word "${elem.textContent}" - Position:`, { x, y, width: rect.width, height: rect.height });

      // Create physics body
      const body = Bodies.rectangle(x, y, rect.width, rect.height, {
        render: { fillStyle: "transparent" },
        restitution: 0.8,
        frictionAir: 0.01,
        friction: 0.2,
      });

      // Add initial velocity
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 5,
        y: 0
      });
      
      // Add initial rotation
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);
      
      return { elem, body };
    });

    // Set initial positions for the word elements
    wordBodies.forEach(({ elem, body }) => {
      elem.style.position = "absolute";
      elem.style.left = `${body.position.x}px`;
      elem.style.top = `${body.position.y}px`;
      elem.style.transform = `translate(-50%, -50%)`;
    });

    // Add mouse interaction
    const mouse = Mouse.create(containerRef.current);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: mouseConstraintStiffness,
        render: { visible: false },
      },
    });
    render.mouse = mouse;

    // Add all bodies to the world
    World.add(engine.world, [
      floor,
      leftWall,
      rightWall,
      ceiling,
      mouseConstraint,
      ...wordBodies.map((wb) => wb.body),
    ]);

    // Start the physics engine and renderer
    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    // Update loop to sync DOM elements with physics bodies
    const updateLoop = () => {
      wordBodies.forEach(({ body, elem }) => {
        const { x, y } = body.position;
        elem.style.left = `${x}px`;
        elem.style.top = `${y}px`;
        elem.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
      });
      
      if (runner.enabled) {
        requestAnimationFrame(updateLoop);
      }
    };
    
    updateLoop();

    // Cleanup function
    return () => {
      console.log("Cleaning up physics");
      Render.stop(render);
      Runner.stop(runner);
      
      if (render.canvas && canvasContainerRef.current) {
        canvasContainerRef.current.removeChild(render.canvas);
      }
      
      World.clear(engine.world);
      Engine.clear(engine);
    };
  }, [
    effectStarted,
    isInitialized,
    gravity,
    wireframes,
    backgroundColor,
    mouseConstraintStiffness,
  ]);

  // Event handlers for manual triggers
  const handleTrigger = () => {
    if (!effectStarted && (trigger === "click" || trigger === "hover")) {
      console.log("Manual trigger activated");
      setEffectStarted(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className="falling-text-container"
      onClick={trigger === "click" ? handleTrigger : undefined}
      onMouseOver={trigger === "hover" ? handleTrigger : undefined}
      style={{
        position: "relative",
        overflow: "hidden",
        // boxShadow:"none",
      }}
    >
      <div
        ref={textRef}
        className="falling-text-target"
        style={{
          fontSize: fontSize,
          lineHeight: 1.4,
        }}
      />
      <div ref={canvasContainerRef} className="falling-text-canvas" />
    </div>
  );
};

export default FallingText;
