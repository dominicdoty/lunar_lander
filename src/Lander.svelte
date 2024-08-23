<script lang="ts">
  import {
    runLander,
    resetLander,
    landerState,
    userCodeFunction,
    canvasRenderLine,
    deg2rad,
    randomizeNumber,
    randomizeVector,
    Rotate,
    canvasRenderPoint,
    Translate,
    Explosion,
    landerSuccessState,
    cartToPolar,
  } from "./render";
  import type { Point, Line } from "./render";
  import { renderable, gground } from "./game";
  import { options } from "./settings";
  import { LanderPhysics } from "./lander";
  import landerSvg from "./lander_sprites/stripped/lander.svg?raw";
  import thrustSvg from "./lander_sprites/stripped/thrust.svg?raw";

  const landerB64 = btoa(landerSvg);
  const thrustB64 = btoa(thrustSvg);

  let lander: LanderPhysics;

  function resetLanderObj() {
    let startX = $options.startingX;
    if (startX < 0 || startX > $gground.length - 1) {
      startX = $gground.length / 2;
      $options.startingX = $gground.length / 2;
    }
    let startPt = $gground[Math.floor(startX)];
    let startAltitude = $options.startingAltitude;
    if (startAltitude < 0) {
      startAltitude = 500;
      $options.startingAltitude = startAltitude;
    }
    startPt = [startPt[0], startPt[1] + startAltitude];

    let startAngle = randomizeNumber(
      $options.startingAngle,
      $options.startingAngleRandomize,
      $options.startingAngleRandomizeAngle,
      0
    );

    let startRotVel = randomizeNumber(
      $options.rotationalVelocity,
      $options.rotationalVelocityRandomize,
      $options.rotationalVelocityRandomizeMagnitude,
      0
    );

    let startLinVel = randomizeVector(
      $options.velocityVectorMagnitude,
      $options.velocityVectorAngle,
      $options.velocityVectorRandomize,
      $options.velocityVectorRandomizeMagnitude,
      $options.velocityVectorRandomizeAngle
    );

    lander = new LanderPhysics(
      startPt, // starting_pos
      startLinVel, // linVel
      startAngle, // angle
      startRotVel, // rotVel
      $userCodeFunction, // userAutoPilot
      $options.enableFuel, // enableFuel
      $options.enableFuelMass // enableFuelMass
    );

    $landerState = lander;
  }

  resetLanderObj();

  let landerImage: HTMLImageElement;
  let thrustImage: HTMLImageElement;

  let exploding = false;
  let explosionStart: number;
  let explosion: Explosion;

  function renderLander(props) {
    const context = props.context as CanvasRenderingContext2D;

    // In a state to fly
    if ($runLander && lander.isAboveGround) {
      try {
        lander.update();
      } catch (err) {
        lander.isAboveGround = false;
        $runLander = false;
      }

      $landerState = lander;

      // Just touched down
      if (!lander.isAboveGround) {
        $runLander = false;

        if (lander.getLanderSuccessState() == "crashed") {
          exploding = true;
          explosion = new Explosion(
            lander.pos,
            lander.linVel,
            lander.fuelLevel / 10 + 1,
            $gground
          );
          explosionStart = performance.now();
        } else {
          $landerSuccessState = lander.getLanderSuccessState();
        }
      }
    } else if (exploding) {
      // Exploding
      if (performance.now() - explosionStart < 4000) {
        explosion.render(context);
      } else {
        exploding = false;
        $landerSuccessState = lander.getLanderSuccessState();
      }
      return;
    }

    if ($resetLander) {
      $runLander = false;
      $resetLander = false;
      $landerSuccessState = "";
      resetLanderObj();
    }

    let drawRotatedImage = (
      image: HTMLImageElement,
      pos: Point,
      angle: number,
      hscale: number = 1,
      wscale: number = 1
    ) => {
      let width = image.width * wscale;
      let height = image.height * hscale;
      context.save();
      context.translate(1 * pos[0], 1 * pos[1]);
      context.rotate(deg2rad(angle));
      context.translate(-1 * pos[0], -1 * pos[1]);
      context.drawImage(
        image,
        lander.pos[0] - width / 2,
        lander.pos[1] - height / 2,
        width,
        height
      );
      context.restore();
    };

    let scaledThrustDraw = (
      pos: Point,
      offset: Point,
      angle: number,
      thrust: number,
      scale: number,
      randomness: number
    ) => {
      let width = thrustImage.width;
      let height =
        thrustImage.height *
        Math.abs(thrust) *
        (scale + randomness * Math.random());
      context.save();
      context.translate(1 * pos[0], 1 * pos[1]);
      context.rotate(deg2rad(angle));
      context.translate(-1 * pos[0], -1 * pos[1]);
      context.drawImage(
        thrustImage,
        lander.pos[0] + offset[0],
        lander.pos[1] + offset[1],
        width,
        height
      );
      context.restore();
    };

    let drawVector = (pos: Point, angle: number, length: number) => {
      let headlen = 5;
      let tox = length;
      let toy = 0;

      if (length == 0) {
        return;
      }

      let points: Line = [
        [0, 0],
        [tox, toy],
        [
          tox - headlen * Math.cos(-Math.PI / 6),
          toy - headlen * Math.sin(-Math.PI / 6),
        ],
        [tox, toy],
        [
          tox - headlen * Math.cos(Math.PI / 6),
          toy - headlen * Math.sin(Math.PI / 6),
        ],
      ];

      points = Rotate(points, angle);
      points = Translate(points, pos);

      context.save();
      context.strokeStyle = "grey";
      context.lineWidth = 1;
      canvasRenderLine(context, points);
      context.restore();
    };

    let drawCircleVector = (pos: Point, diameter: number, angle: number) => {
      angle *= -1;
      let headlen = 5;

      if (angle > 360) {
        angle = 360;
      }

      if (angle < -360) {
        angle = -360;
      }

      if (angle == 0) {
        return;
      }

      let headPoints: Line = [
        [-headlen * Math.cos(-Math.PI / 6), -headlen * Math.sin(-Math.PI / 6)],
        [0, 0],
        [-headlen * Math.cos(Math.PI / 6), -headlen * Math.sin(Math.PI / 6)],
      ];

      headPoints = Rotate(headPoints, angle > 0 ? 0 : 180);
      headPoints = Translate(headPoints, [diameter / 2, 0]);
      headPoints = Rotate(headPoints, -angle);
      headPoints = Translate(headPoints, pos);

      context.strokeStyle = "grey";
      context.lineWidth = 1;
      canvasRenderLine(context, headPoints);

      context.beginPath();
      context.arc(
        pos[0],
        pos[1],
        diameter / 2,
        deg2rad(90),
        deg2rad(90 + angle),
        angle < 0
      );
      context.stroke();
    };

    // Velocity Vector
    let [velMagnitude, velAng] = cartToPolar(lander.linVel);
    drawVector(lander.pos, velAng, velMagnitude * 15);

    // Rotation Vector
    drawCircleVector(lander.pos, 50, lander.rotVel * 30);

    // Draw BBOX
    if (false) {
      context.fillStyle = "red";
      lander.getBbox().forEach((p) => {
        canvasRenderPoint(context, p, 2);
      });
    }

    // Thrusters
    if (lander.aftThrust > 0) {
      scaledThrustDraw(
        lander.pos,
        [
          -thrustImage.width / 2,
          +landerImage.height / 4 - thrustImage.height / 8,
        ],
        -1 * (lander.angle + 180),
        lander.aftThrust,
        3,
        1
      );
    }

    // Draw Rotational Thrusters
    if (lander.rotThrust > 0) {
      scaledThrustDraw(
        lander.pos,
        [landerImage.height / 6, landerImage.width / 5],
        -1 * (lander.angle + 90),
        lander.rotThrust,
        1,
        1
      );
      scaledThrustDraw(
        lander.pos,
        [landerImage.height / 6, landerImage.width / 5],
        -1 * (lander.angle - 90),
        lander.rotThrust,
        1,
        1
      );
    } else if (lander.rotThrust < 0) {
      scaledThrustDraw(
        lander.pos,
        [-landerImage.height / 6, landerImage.width / 5],
        -1 * (lander.angle + 90),
        lander.rotThrust,
        1,
        1
      );
      scaledThrustDraw(
        lander.pos,
        [-landerImage.height / 6, landerImage.width / 5],
        -1 * (lander.angle - 90),
        lander.rotThrust,
        1,
        1
      );
    }

    // Draw Lander
    drawRotatedImage(landerImage, lander.pos, -1 * lander.angle);
  }

  renderable(renderLander);
</script>

<div class="is-hidden">
  <img
    bind:this={landerImage}
    alt="lander, hidden"
    src="data:image/svg+xml;base64,{landerB64}"
  />
  <img
    bind:this={thrustImage}
    alt="lander, hidden"
    src="data:image/svg+xml;base64,{thrustB64}"
  />
</div>
