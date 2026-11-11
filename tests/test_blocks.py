import json
import re

from wagtail import hooks

from wagtail_charts.blocks import CHART_COLOR_CHOICES, MULTI_CHART_TYPES, ChartBlock, ChartBlockAdapter

DATASETS = json.dumps({"data": [["", "2024", "2025"], ["Cats", 1, 2]], "options": {}})


def make_value(**overrides):
    raw = {"title": "Pets", "chart_type": "bar", "datasets": DATASETS, "settings": {}}
    raw.update(overrides)
    return ChartBlock().to_python(raw)


def test_settings_config_is_json_with_defaults():
    config = json.loads(make_value()["settings"].config)

    assert config["legend_position"] == "top"
    assert config["stacking"] == "none"
    assert config["chart_markers"] == []


def test_settings_config_serialises_chart_markers():
    markers = [{"type": "marker", "value": {"colour": "#000000", "label": "Target", "value": "5"}, "id": "m1"}]
    value = make_value(settings={"chart_markers": markers})

    config = json.loads(value["settings"].config)

    assert config["chart_markers"][0]["value"]["label"] == "Target"


def test_render_outputs_canvas_with_chart_data():
    html = ChartBlock().render(make_value())

    assert "<h3>Pets</h3>" in html
    assert 'data-chart-type="bar"' in html
    assert re.search(r'id="chart-[0-9a-f-]{36}"', html)
    assert "nav-chart-" not in html


def test_render_includes_navigator_canvas_when_enabled():
    html = ChartBlock().render(make_value(settings={"chart_navigator": True}))

    assert re.search(r'id="nav-chart-[0-9a-f-]{36}"', html)


def test_adapter_passes_chart_options_to_admin():
    meta = ChartBlockAdapter().js_args(ChartBlock())[2]

    assert meta["colors"] == CHART_COLOR_CHOICES
    assert meta["multi_chart_types"] == MULTI_CHART_TYPES


def test_adapter_media_includes_editor_assets():
    media = ChartBlockAdapter().media

    assert "wagtailcharts/js/chart-dataset.js" in media._js
    assert "wagtailcharts/css/wagtailcharts.css" in media._css["all"]


def test_admin_icon_is_registered():
    icons = []
    for fn in hooks.get_hooks("register_icons"):
        icons = fn(icons)

    assert "wagtailcharts/icons/chart-line-solid-full.svg" in icons


CALLBACKS = (("hide_gridlines", "Hide gridlines"),)


def test_callbacks_block_is_only_added_when_configured():
    assert "callbacks" not in ChartBlock().child_blocks
    assert "callbacks" in ChartBlock(callbacks=CALLBACKS).child_blocks


def test_render_outputs_selected_callback_name():
    block = ChartBlock(callbacks=CALLBACKS)
    value = block.to_python(
        {"title": "Pets", "chart_type": "bar", "datasets": DATASETS, "settings": {}, "callbacks": "hide_gridlines"}
    )

    assert 'data-callback="hide_gridlines"' in block.render(value)


def test_callbacks_block_rejects_unknown_names():
    import pytest
    from django.core.exceptions import ValidationError

    with pytest.raises(ValidationError):
        ChartBlock(callbacks=CALLBACKS).child_blocks["callbacks"].clean("alert(1)")


def test_adapter_passes_callbacks_to_admin():
    meta = ChartBlockAdapter().js_args(ChartBlock(callbacks=CALLBACKS))[2]

    assert meta["callbacks"] == CALLBACKS


def test_render_has_no_stray_markup_inside_canvas():
    html = ChartBlock().render(make_value())

    assert not re.search(r">\s*>\s*<p>", html)
    assert "data-callback" not in html
