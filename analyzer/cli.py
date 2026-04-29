"""creative-analyzer command-line interface."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import click

from .config import Settings
from .models import ProductInfo
from .pipeline import analyze_video


def _setup_logging(verbose: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


@click.group(context_settings={"help_option_names": ["-h", "--help"]})
@click.version_option(package_name="creative-analyzer-dz")
def cli() -> None:
    """Analyze ad videos and generate Algerian-darija creative variants."""


@cli.command("analyze")
@click.option("--video", "video", type=click.Path(exists=True, path_type=Path), required=True)
@click.option("--product", "product_name", type=str, required=True)
@click.option("--description", "description", type=str, default="")
@click.option("--price", "price", type=float, default=None)
@click.option("--old-price", "old_price", type=float, default=None)
@click.option("--currency", "currency", type=str, default="DZD")
@click.option("--phone", "phone", type=str, default=None, help="Algerian COD phone (e.g. 0555121212).")
@click.option("--no-shipping", "no_shipping", is_flag=True, default=False)
@click.option("--out", "out_dir", type=click.Path(path_type=Path), default=Path("runs/run01"))
@click.option("--n-creatives", "n_creatives", type=int, default=8)
@click.option("--per-role", "per_role", type=int, default=5)
@click.option(
    "--strategy",
    type=click.Choice(["zip_balanced", "cartesian"]),
    default="zip_balanced",
)
@click.option("-v", "--verbose", is_flag=True, default=False)
def analyze_cmd(
    video: Path,
    product_name: str,
    description: str,
    price: float | None,
    old_price: float | None,
    currency: str,
    phone: str | None,
    no_shipping: bool,
    out_dir: Path,
    n_creatives: int,
    per_role: int,
    strategy: str,
    verbose: bool,
) -> None:
    """Run the full pipeline on VIDEO and write a creative report."""
    _setup_logging(verbose)

    settings = Settings.from_env()
    if not settings.has_llm:
        click.secho(
            "تنبيه: OPENAI_API_KEY غير محدّد — سيتم استعمال القوالب الجاهزة فقط بدون توليد ذكي.",
            fg="yellow",
            err=True,
        )

    product = ProductInfo(
        name=product_name,
        description=description,
        price=price,
        old_price=old_price,
        currency=currency,
        landing_phone=phone,
        free_shipping=not no_shipping,
    )

    result = analyze_video(
        video_path=video,
        product=product,
        out_dir=out_dir,
        settings=settings,
        n_creatives=n_creatives,
        per_role=per_role,
        strategy=strategy,
    )

    click.secho(
        f"\n✔ تم. {len(result.scenes)} مشهد • {len(result.creatives)} كرياتيف.",
        fg="green",
    )
    click.echo(f"  - تقرير Markdown : {out_dir / 'report.md'}")
    click.echo(f"  - تقرير HTML    : {out_dir / 'report.html'}")
    click.echo(f"  - JSON          : {out_dir / 'analysis.json'}")
    click.echo(f"  - CSV           : {out_dir / 'creatives.csv'}")


@cli.command("serve")
@click.option("--host", default="0.0.0.0", show_default=True)
@click.option("--port", default=8000, show_default=True, type=int)
@click.option("--reload/--no-reload", default=False)
def serve_cmd(host: str, port: int, reload: bool) -> None:
    """Launch the drag-and-drop web UI."""
    import uvicorn

    uvicorn.run("webapp.app:app", host=host, port=port, reload=reload)


def main() -> None:  # pragma: no cover
    try:
        cli()
    except Exception as exc:
        click.secho(f"Error: {exc}", fg="red", err=True)
        sys.exit(1)


if __name__ == "__main__":  # pragma: no cover
    main()
