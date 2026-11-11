import json

from django import forms
from django.utils.functional import cached_property
from wagtail.admin.telepath import register
from wagtail.blocks import (
    BooleanBlock,
    CharBlock,
    ChoiceBlock,
    IntegerBlock,
    StreamBlock,
    StructBlock,
    StructValue,
    TextBlock,
)
from wagtail.blocks.struct_block import StructBlockAdapter
from wagtail_color_panel.blocks import NativeColorBlock

CHART_TYPES = (
    ("line", "Line Chart"),
    ("bar", "Vertical Bar Chart"),
    ("bar_horizontal", "Horizontal Bar Chart"),
    ("area", "Area Chart"),
    ("multi", "Combo Line/Bar/Area Chart"),
    ("pie", "Pie Chart"),
    ("doughnut", "Doughnut Chart"),
    ("radar", "Radar Chart"),
    ("polar", "Polar Chart"),
    ("waterfall", "Waterfall Chart"),
    ("scatter", "Scatter Chart"),
    # not fully implemented yet
    # ("bubble", "Bubble Chart"),
)

MULTI_CHART_TYPES = (
    ("bar", "Bar"),
    ("line", "Line"),
    ("area", "Area"),
)

CHART_COLOR_CHOICES = (
    ("#e6023b", "Red"),
    ("#195c94", "Blue"),
    ("#4caba5", "Cyan"),
    ("#f47b27", "Orange"),
    ("#8e50bd", "Purple"),
    ("#4a4a4a", "Grey"),
)


class SettingsStructValue(StructValue):

    @property
    def config(self):
        self_as_dict = dict(self)
        # force chart_markers StreamValue field to dict
        raw_chart_markers = self_as_dict["chart_markers"].raw_data
        self_as_dict["chart_markers"] = list(raw_chart_markers)

        return json.dumps(self_as_dict)


class ChartMarkerBlock(StructBlock):

    colour = NativeColorBlock(default="#169B62")
    label = CharBlock(required=False)
    value = CharBlock(required=False)

    class Meta:  # type: ignore
        icon = "site"
        label = "Marker Entry"


class ChartSettingsBlock(StructBlock):
    # General Settings
    show_legend = BooleanBlock(default=False, required=False, label="Show legend", group="General")
    html_legend = BooleanBlock(default=False, required=False, label="Use HTML legend", group="General")
    legend_position = ChoiceBlock(
        choices=(
            ("top", "Top"),
            ("bottom", "Bottom"),
            ("left", "Left"),
            ("right", "Right"),
        ),
        default="top",
        label="Legend position",
        group="General",
    )
    reverse_legend = BooleanBlock(default=False, required=False, label="Reverse legend", group="General")
    unit_override = CharBlock(required=False, label="Unit override", group="General")
    show_values_on_chart = BooleanBlock(default=False, required=False, label="Show values on chart", group="General")
    precision = IntegerBlock(default=1, label="Precision in labels/tooltips", group="General")
    show_grid = BooleanBlock(default=True, required=False, label="Show Chart Grid", group="General")
    stacking = ChoiceBlock(
        choices=(
            ("none", "No stacking"),
            ("stacked", "Stacked"),
            ("stacked_100", "Stacked 100%"),
        ),
        default="none",
        label="Stacking",
        group="General",
    )
    point_style = ChoiceBlock(
        choices=(
            ("none", "None"),
            ("circle", "Circle"),
            ("cross", "Cross"),
            ("crossRot", "CrossRot"),
            ("dash", "Dash"),
            ("line", "Line"),
            ("rect", "Rect"),
            ("rectRounded", "RectRounded"),
            ("rectRot", "RectRot"),
            ("star", "Star"),
            ("triangle", "Triangle"),
        ),
        default="circle",
        label="Point Style",
        group="General",
    )
    aspect_ratio = ChoiceBlock(
        choices=(
            ("none", "Default"),
            ("0.5", "0.5"),
            ("1", "1"),
            ("1.5", "1.5"),
        ),
        default="none",
        label="Chart Aspect Ratio",
        group="General",
    )
    column_as_dataset = BooleanBlock(default=False, required=False, label="Column as Dataset", group="General")
    x_label = CharBlock(required=False, label="X axis label", group="General")
    x_tick_label_step = CharBlock(required=False, label="X tick label step", group="General")
    chart_navigator = BooleanBlock(default=False, required=False, label="Enable Chart Navigator", group="General")
    chart_title = CharBlock(required=False, label="Chart title", group="General")

    # Left Axis settings
    y_left_min = CharBlock(required=False, label="Left Y axis minimum value", group="Left_Axis")
    y_left_max = CharBlock(required=False, label="Left Y axis maximum value", group="Left_Axis")
    y_left_log_scale = BooleanBlock(default=False, required=False, label="Logarithmic (log) Scale", group="Left_Axis")
    y_left_step_size = CharBlock(required=False, label="Left Y axis step size", group="Left_Axis")
    y_left_label = CharBlock(required=False, label="Left Y axis label", group="Left_Axis")
    y_left_data_type = ChoiceBlock(
        choices=(("number", "Numerical"), ("percentage", "Percentage"), ("absolute_number", "Absolute Number")),
        default="number",
        label="Left Y axis data type",
        required=False,
        group="Left_Axis",
    )
    y_left_precision = IntegerBlock(default=0, label="Left Y axis tick precision", group="Left_Axis")
    y_left_show = BooleanBlock(default=True, required=False, label="Show left axis numbers", group="Left_Axis")

    # Right Axis Settings
    y_right_min = CharBlock(required=False, label="Right Y axis minimum value", group="Right_Axis")
    y_right_max = CharBlock(required=False, label="Right Y axis maximum value", group="Right_Axis")
    y_right_log_scale = BooleanBlock(default=False, required=False, label="Logarithmic (log) Scale", group="Right_Axis")
    y_right_step_size = CharBlock(required=False, label="Right Y axis step size", group="Right_Axis")
    y_right_label = CharBlock(required=False, label="Right Y axis label", group="Right_Axis")
    y_right_data_type = ChoiceBlock(
        choices=(("number", "Numerical"), ("percentage", "Percentage"), ("absolute_number", "Absolute Number")),
        default="number",
        label="Right Y axis data type",
        required=False,
        group="Right_Axis",
    )
    y_right_precision = IntegerBlock(default=0, label="Right Y axis tick precision", group="Right_Axis")
    y_right_show = BooleanBlock(default=True, required=False, label="Show right axis numbers", group="Right_Axis")

    # Pie/Doughnut Chart settings
    pie_border_width = IntegerBlock(default=2, label="Width of pie slice border", group="Pie_Chart")
    pie_border_color = CharBlock(default="#fff", label="Color of pie slice border", group="Pie_Chart")

    # Scatter Chart settings
    scatter_enable_connector = BooleanBlock(
        default=False, required=False, label="Enable Connector", group="Scatter_Chart"
    )
    chart_marker_label_position = ChoiceBlock(
        choices=(("-20", "Top"), ("0", "Center"), ("20", "Bottom")),
        default="0",
        label="Marker Label Aligment",
        group="Scatter_Chart",
    )
    chart_markers = StreamBlock(
        [("marker", ChartMarkerBlock())], required=False, label="Chart Markers", group="Scatter_Chart"
    )

    class Meta:  # type: ignore
        form_template = "wagtailcharts/blocks/settings.html"
        label = "Chart Settings"
        value_class = SettingsStructValue


class ChartBlock(StructBlock):

    def __init__(self, **kwargs):

        super().__init__(**kwargs)

        # Optional config callbacks: `callbacks` is a list of (name, label) choices. The chosen name is
        # rendered as data-callback and resolved on the front end via window.WAGTAILCHARTS_CALLBACKS.
        if kwargs.get("callbacks"):
            callbacks_block = ChoiceBlock(
                choices=kwargs.get("callbacks"), label="Chart Config Callbacks", required=False
            )
            callbacks_block.set_name("callbacks")
            self.child_blocks["callbacks"] = callbacks_block

    title = CharBlock(required=False)
    chart_type = ChoiceBlock(choices=CHART_TYPES, label="Chart Type", required=True, default=CHART_TYPES[0][0])
    datasets = TextBlock(default='{"data":[], "options":{}}')

    settings = ChartSettingsBlock()

    class Meta:  # type: ignore
        icon = "chart-line-solid-full"
        label = "Chart"
        template = "wagtailcharts/blocks/chart_block.html"
        colors = CHART_COLOR_CHOICES
        multi_chart_types = MULTI_CHART_TYPES
        callbacks = None


class ChartBlockAdapter(StructBlockAdapter):
    js_constructor = "wagtailcharts.blocks.ChartBlock"

    def js_args(self, block):
        result = super().js_args(block)

        meta = result[2]
        meta["colors"] = block.meta.colors
        meta["multi_chart_types"] = block.meta.multi_chart_types
        meta["callbacks"] = block.meta.callbacks
        result[2] = meta

        return result

    @cached_property
    def media(self):
        structblock_media = super().media
        return forms.Media(
            js=structblock_media._js  # type: ignore
            + [
                "wagtailcharts/js/chart-types.js",
                "wagtailcharts/js/chart-dataset.js",
                "wagtailcharts/js/jspreadsheet.min.js",
                "wagtailcharts/js/jsuites.min.js",
            ],
            css={
                **structblock_media._css,  # type: ignore
                **{
                    "all": (
                        "wagtailcharts/css/jspreadsheet.min.css",
                        "wagtailcharts/css/jspreadsheet.themes.css",
                        "wagtailcharts/css/jsuites.min.css",
                        "wagtailcharts/css/wagtailcharts.css",
                    )
                },
            },
        )


register(ChartBlockAdapter(), ChartBlock)
