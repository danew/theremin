# theremin

a theremin you play with your mouse, built with three.js and the web audio api.

**play it here: https://danew.github.io/theremin/**

## what's a theremin

a theremin is an electronic instrument you play without touching it. it was invented around 1920 by leon theremin, a russian physicist who was actually working on proximity sensors at the time. the instrument came out of that work.

it has two antennas. the vertical one on the right controls pitch, and the loop on the left controls volume. you play it by moving your hands through the air around them: move your right hand closer to the vertical antenna and the pitch goes up, lower your left hand toward the loop and the sound fades out.

the trick is that your body has electrical capacitance. inside the theremin there are two high-frequency oscillators, one fixed and one whose frequency shifts slightly as your hand gets closer to the antenna. both run way above anything you can hear, but the difference between them lands in the audible range, and that difference is the note you hear. move your hand a few centimetres and the difference changes, which means the pitch changes. the volume antenna works on the same idea, just wired up to control loudness instead.

there are no keys, frets, or fixed notes, so playing in tune is entirely down to how precisely you hold your hand in the air. that's why it's notoriously hard to play well, and why it has that swoopy, voice-like sound you've probably heard in old sci-fi film scores.

## how this version works

we can't measure capacitance through a browser, so this swaps the electronics for some simple maths and a single 3d "hand" that follows your mouse.

pitch comes from the horizontal distance between your hand and the vertical antenna. it's mapped exponentially, so every octave takes up the same physical distance:

```
t = (d - minDist) / (maxDist - minDist)
f = 110 · 2^(4 · (1 - t))
```

that covers four octaves, a2 to a6. a real theremin isn't this even, since its pitch field gets much more sensitive close to the antenna, but equal spacing makes the thing a lot easier to actually play.

volume comes from how high your hand is above the loop. it's squared so the fade sounds smooth instead of dropping off a cliff. drop your hand to the loop and it goes silent.

because pitch only cares about horizontal distance and volume only cares about height, one hand can control both independently.

the sound is a web audio oscillator with a custom waveform, mostly a sine with a few soft harmonics, which gets you close to the classic theremin tone. it runs through a vibrato lfo, a low-pass filter, a feedback echo, and a compressor, and every change is smoothed so you don't get clicks.

## controls

| input | what it does |
| --- | --- |
| mouse | move your hand left/right and up/down |
| scroll or `W`/`S` | move your hand toward or away from you |
| right-drag | orbit the camera |
| `Q` | snap to notes |
| `V` | toggle vibrato |
| `E` | toggle echo |
| `Space` | mute |

the rings around the antenna mark each semitone at your hand's height, with the c notes labelled, so you can see where the notes are instead of hunting for them by ear.

## running it locally

there's no build step. three.js loads from a cdn, so you just need to serve the folder:

```sh
python3 -m http.server 8765
```

then open http://localhost:8765 and click to start the audio. the tuning lives in `CFG` at the top of `main.js` if you want a different range or feel.
