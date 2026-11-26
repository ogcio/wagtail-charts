import json
from decimal import Decimal, InvalidOperation
from uuid import uuid4

from django import template
from django.template.loader import render_to_string
from django.utils.translation import gettext

register = template.Library()


@register.simple_tag
def render_charts():
    return render_to_string("wagtailcharts/tags/render_charts.html")


@register.simple_tag
def generate_uuid4():
    return uuid4()


@register.filter()
def addspace(val):
    return val.replace("_", " ")


@register.filter
def chart_data_table(raw, chart_type=None):
    """Expose the category row and named series of a chart."""
    try:
        dataset = json.loads(raw)
    except (TypeError, ValueError):
        return
    if not isinstance(dataset, dict):
        return
    data = dataset.get("data")
    options = dataset.get("options")
    if not isinstance(data, list) or len(data) < 2 or not isinstance(options, dict):
        return
    titles = options.get("title")
    if not isinstance(titles, list) or len(titles) != len(data):
        return
    headers = data[0]
    if not isinstance(headers, list) or not headers:
        return
    if any(not isinstance(row, list) or len(row) != len(headers) for row in data[1:]):
        return
    if chart_type == "waterfall":
        return waterfall_steps(titles[1:], data[1:])
    return {"headers": headers, "rows": zip(titles[1:], data[1:])}


register.filter("bar_data_table", chart_data_table)


def waterfall_steps(titles, rows):
    """Pair each step's change with the running total the chart draws."""
    try:
        totals = [Decimal(str(row[0])) for row in rows]
    except InvalidOperation:
        return
    last = len(totals) - 1
    values = [[None if i in (0, last) else total - totals[i - 1], total] for i, total in enumerate(totals)]
    return {"headers": [gettext("Change"), gettext("Running total")], "rows": zip(titles, values)}
