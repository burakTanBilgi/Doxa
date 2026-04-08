## TODO

// you are not allowed to tick of these boxes. I will check them after reviewing your implementation
- [x] The numbers should be displayed on the chart itself as well.
- [x] The numbers should of each interval be displayed on the chart itself as well. 
- [x] The charts should be draggable on the right panel as well.
- [x] I can't scroll the bars on the control panel when i try to do that i am just dragging the whole field/trait. It should be controlled this way: When i click the bar i can only control the value by scrolling the bar. If i click it again or click elsewhere when i click and hold i should be dragging the field or trait 
- [x] when dragging a chart or field for dragging it should be easier to scroll up or down. Holding the mouse button and just moving the mouse up or down should scroll the panel. in an easy wayz
- [x] The charts and the control panels on the left should have better drag/order logic. If a chart is dragged over another chart, it should swap positions. There should be a visual indicator of where the chart will be dropped. also the gaps should be draggable as well.
- [x] The fields across different charts should be swappable or could be transferred from one chart to another.
- [x] when dragging sth it displayes an endless line going to the right side of the page to infinity
- [x] The asymetrical scrolling should be able to be toggled on and off. it should be on by default. The only way to toggle it must be if both the scrolls are at the very top of the page. It should be a button that only appears (little animations) next to the Export button. it should be black as the one in the logo. It should be a toggle button that shows a icon of a lcok and two vertical lines (like a lock) when it's on and a unlock icon when it's off. 
- [x] Change the new logo to Doxa2.png
- [x] The charts should be draggable to empty spaces where there are no charts or gaps between two charts that are next to each other
- [] On the View Panel: 
  -[] the "Add Chart" button should only pop up only when the right edge of the last chart is hovered upon. It should be like a card (animated) that pops up behind the last chart. LAST CHART. get rid of the previous implementation first
  -[eh] the charts when dragged on top of each other should swap places and the gaps between them should be draggable as well
  -[] the charts should be draggable to the gaps between them. Example: If dragged between 1-2 the chart should be now the 2nd chart.
  - [] The add button should not have "Add Chart" text, just the "+" icon
  - [] The add button should just be a small circle with a "+" icon in it it should not be a card.
  - [] The add button should be positioned (always) on where it is shown in the screenshot provided in your prompt: one third of the charts' (that are at the bottom of the site) card's height from the bottom. It should be visible when hovered around the area. Even where there are 2 cards at the end of the page this small add button icon should appear between them (where it is always positioned) when hovered upon

## NOT TO DO (YET)


- [ ] from the view panel a value should be able to be adjusted by scrolling the dot in the chart up or down or sideways



## Cinzel and Inter Font

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">

<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
</style>

.cinzel-<uniquifier> {
  font-family: "Cinzel", serif;
  font-optical-sizing: auto;
  font-weight: <weight>;
  font-style: normal;
}


.inter-<uniquifier> {
  font-family: "Inter", sans-serif;
  font-optical-sizing: auto;
  font-weight: <weight>;
  font-style: normal;
}