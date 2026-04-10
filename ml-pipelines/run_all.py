"""
Headless runner for all ML pipeline notebooks.

Executes each notebook top-to-bottom using papermill and copies the
generated JSON artifacts to the backend directory so the API serves
fresh predictions.

Usage:
    python run_all.py              # run all pipelines
    python run_all.py --only resident-intervention-recommender
"""

import argparse
import shutil
import sys
import time
from pathlib import Path

import papermill as pm

PIPELINES_DIR = Path(__file__).resolve().parent
BACKEND_DIR = PIPELINES_DIR.parent / "intex-backend"

NOTEBOOKS = [
    "resident-risk-predictor.ipynb",
    "resident-intervention-recommender.ipynb",
    "donor-churn-classifier.ipynb",
    "donor-segmentation-kmeans.ipynb",
    "social-media-donation-predictor.ipynb",
]

ARTIFACTS_TO_COPY = {
    "resident_recommendations.json": BACKEND_DIR / "resident_recommendations.json",
    "donor_segments.json": BACKEND_DIR / "donor_segments.json",
    "social_media_insights.json": BACKEND_DIR / "social_media_insights.json",
}


def run_notebook(notebook_name: str, save_outputs: bool = False) -> bool:
    input_path = PIPELINES_DIR / notebook_name
    output_path = input_path if save_outputs else PIPELINES_DIR / f".output-{notebook_name}"

    if not input_path.exists():
        print(f"  SKIP  {notebook_name} (file not found)")
        return True

    print(f"  RUN   {notebook_name} ...", flush=True)
    start = time.time()
    try:
        pm.execute_notebook(
            str(input_path),
            str(output_path),
            cwd=str(PIPELINES_DIR),
            kernel_name="python3",
        )
        elapsed = time.time() - start
        print(f"  OK    {notebook_name} ({elapsed:.1f}s)")
        if not save_outputs:
            output_path.unlink(missing_ok=True)
        return True
    except pm.PapermillExecutionError as exc:
        elapsed = time.time() - start
        print(f"  FAIL  {notebook_name} ({elapsed:.1f}s)")
        print(f"        Cell {exc.cell_index}: {exc.ename}: {exc.evalue}")
        return False
    except Exception as exc:
        elapsed = time.time() - start
        print(f"  FAIL  {notebook_name} ({elapsed:.1f}s)")
        print(f"        {type(exc).__name__}: {exc}")
        return False


def copy_artifacts():
    """Copy generated JSON files from the pipelines dir to the backend."""
    for filename, dest in ARTIFACTS_TO_COPY.items():
        src = PIPELINES_DIR / filename
        if src.exists():
            shutil.copy2(src, dest)
            print(f"  COPY  {filename} -> {dest.relative_to(PIPELINES_DIR.parent)}")
        else:
            backend_src = BACKEND_DIR / filename
            if backend_src.exists():
                print(f"  OK    {filename} (already in backend dir)")
            else:
                print(f"  WARN  {filename} not found")


def main():
    parser = argparse.ArgumentParser(description="Run ML pipeline notebooks")
    parser.add_argument(
        "--only",
        help="Run only the specified notebook (without .ipynb extension)",
    )
    parser.add_argument(
        "--save-outputs",
        action="store_true",
        help="Write executed outputs back into the original notebook files",
    )
    args = parser.parse_args()

    if args.only:
        name = args.only if args.only.endswith(".ipynb") else f"{args.only}.ipynb"
        notebooks = [name]
    else:
        notebooks = NOTEBOOKS

    print(f"ML Pipeline Runner — {len(notebooks)} notebook(s)\n")

    results = {}
    for nb in notebooks:
        results[nb] = run_notebook(nb, save_outputs=args.save_outputs)

    print("\nCopying artifacts to backend...")
    copy_artifacts()

    failed = [nb for nb, ok in results.items() if not ok]
    print(f"\n{'=' * 50}")
    if failed:
        print(f"DONE with {len(failed)} failure(s): {', '.join(failed)}")
        sys.exit(1)
    else:
        print(f"DONE — all {len(results)} notebook(s) succeeded")


if __name__ == "__main__":
    main()
