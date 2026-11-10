# wagtail-charts

A chart StreamField block for [Wagtail](https://wagtail.org), drawn with
[Chart.js](https://www.chartjs.org). Editors enter chart data in a spreadsheet editor in the
Wagtail admin and choose the chart type and display settings alongside it.

Maintained by the Office of the Government Chief Information Officer (OGCIO) for
[gov.ie](https://www.gov.ie). It started as a fork of
[wagtailcharts](https://github.com/overcastsoftware/wagtailcharts) by Overcast Software.

## Chart types

Line, vertical bar, horizontal bar, area, combo (line/bar/area), pie, doughnut, radar, polar,
waterfall and scatter. Bar and area charts can be stacked or stacked to 100%, and horizontal
bars can be drawn as a pyramid.

## Requirements

- Python 3.10+
- Wagtail 7.1+
- [wagtail-color-panel](https://pypi.org/project/wagtail-color-panel/) (installed automatically)

## Installation

```sh
pip install ogcio-wagtail-charts
```

Add the app and its dependency to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    # ...
    "wagtail_charts",
    "wagtail_color_panel",
    # ...
]
```

## Usage

Add `ChartBlock` to a StreamField:

```python
from wagtail.fields import StreamField
from wagtail.models import Page

from wagtail_charts.blocks import ChartBlock


class ReportPage(Page):
    body = StreamField([
        ("chart", ChartBlock()),
    ])
```

Load the Chart.js scripts once in your base template, after the page content (for example just
before `</body>`):

```django
{% load wagtailcharts_tags %}

{% render_charts %}
```

### Colours

Dataset colours are chosen from a palette. Pass your own as `colors`, a sequence of
`(hex value, label)` pairs:

```python
from wagtail_charts.blocks import CHART_COLOR_CHOICES, ChartBlock

ChartBlock(colors=CHART_COLOR_CHOICES + (("#ffd700", "Gold"),))
```

### Config callbacks

To customise Chart.js options beyond the editor settings, pass named callbacks as `callbacks`, a
sequence of `(name, label)` pairs. Editors can then pick one per chart:

```python
ChartBlock(callbacks=(("hide_gridlines", "Hide gridlines"),))
```

Register a function with the same name before `{% render_charts %}`. It must return an options
object, which is deep-merged into the chart's Chart.js options:

```html
<script>
  window.WAGTAILCHARTS_CALLBACKS = {
    hide_gridlines: () => ({ scales: { x: { grid: { display: false } }, y: { grid: { display: false } } } }),
  };
</script>
```

Callbacks are looked up by name and never evaluated as code, so charts work under a Content
Security Policy without `'unsafe-eval'`.

### Templates

To change the chart markup, override `wagtailcharts/blocks/chart_block.html` in your project's
templates.

## Development

```sh
python -m venv .venv
.venv/bin/pip install -e ".[test]"
.venv/bin/pytest
```

## Contributing

Please commit with your GitHub `noreply` email address
([how to set it up](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/setting-your-commit-email-address))
so that your personal address is not published in the git history.

To report a security issue, see [SECURITY.md](SECURITY.md).

## Releasing

1. Update `version` in `pyproject.toml` and add an entry to `CHANGELOG.md`.
2. Optionally, run the **Publish** workflow manually from the Actions tab to upload to
   [TestPyPI](https://test.pypi.org/project/ogcio-wagtail-charts/) and check the result.
3. Create a GitHub release with a tag matching the version (for example `v0.1.0`). Publishing
   the release runs the tests, builds the package and uploads it to PyPI.

## Licence

MIT. See [LICENSE](LICENSE), which also lists the bundled third-party JavaScript libraries.
