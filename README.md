Demo Prompts
Tier-1
draw a simple clock showing 3 o clock
draw a simple floor plan with bedroom, kitchen, bathroom and living room
draw a simple bar chart with 5 bars labeled Jan, Feb, Mar, Apr, May
draw a simple traffic light with three circles for red, yellow and green
draw a simple solar system with a large sun and three planets labeled P1, P2, P3
draw a simple circuit diagram with a battery, two resistors R1 and R2, and a bulb in series
draw a simple mandala with four concentric circles and eight radiating lines
draw a simple castle with three towers and an arched gate
draw a dartboard with five concentric circles and the number 10 in the center
draw a DNA double helix with two parallel curves and horizontal rungs

Tier-2
draw a simple city skyline with five buildings of different heights labeled CITY
draw a simple robot face with square head, circular eyes, rectangular mouth
draw a tic tac toe board with X in top left, center, bottom right and O in top center and middle left
draw a simple pie chart divided into three sections labeled Sales, Marketing, Operations
draw a simple line graph with three data points labeled Jan, Feb, Mar on X axis

## Limitations

### What this MCP does well
- Technical and scientific diagrams (circuits, DNA, floor plans)
- Data visualization (bar charts, line graphs, pie charts)
- Geometric patterns (mandalas, dartboards, concentric shapes)
- Labeled diagrams (solar system, traffic light, clocks)
- Grid-based drawings (tic tac toe, chess board)
- Composite geometric scenes (city skyline, castle, robot)

### Current limitations

**1. Natural scenes**
The system struggles with natural/organic scenes like
landscapes, beaches, forests, and weather. These require
artistic curve judgment that coordinate-based tools cannot
reliably produce.

**2. Realistic objects**
Animals, vehicles, and human figures with organic curves
(cats, cars, birds) are beyond the current geometric
primitive set. The system can draw simplified/cartoon
versions but not realistic representations.

**3. Orientation-dependent objects**
Objects that require precise perspective (side-view car,
airplane, 3D shapes) often have spatial positioning errors
since the planner works in 2D coordinate space only.

**4. Artistic illustrations**
The system produces geometric/schematic drawings, not
artistic illustrations. Output style is closer to a
technical diagram than hand-drawn art.

**5. Text rendering**
Text labels occasionally fail pixel-level verification
due to anti-aliasing, though the text is visually present
on the canvas.

**6. Complex compositions**
Scenes with more than 15 shapes may experience minor
coordinate drift where elements don't align perfectly.

### Model dependency
Drawing quality is directly tied to the AI model used.
Currently optimized for DeepSeek V4 Pro. Weaker models
(e.g. 7B parameter local models) produce significantly
degraded spatial reasoning.
