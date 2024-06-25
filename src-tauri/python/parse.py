from __future__ import annotations

from pathlib import Path
from typing import Callable

import pandas as pd
from bs4 import BeautifulSoup


def finder(class_name: str) -> Callable[[pd.DataFrame], pd.Series[str]]:
    def inner_finder(df: pd.DataFrame) -> pd.Series[str]:
        def inner_inner_finder(soup: BeautifulSoup) -> str:
            inner_text = soup.find(attrs={"class": class_name})
            if inner_text is None:
                return ""
            return inner_text.text

        return df["soup"].apply(inner_inner_finder)

    return inner_finder


current_dir = Path(__file__).parent

champs_df = (
    pd.Series(
        BeautifulSoup(
            Path(f"{current_dir}/input.html").read_text(encoding="UTF-8"),
            features="lxml",
        ).find_all(
            attrs={"class": "h-[52px]"},
        ),
    )
    .to_frame("soup")
    .assign(
        name=finder("text-xl"),
        win=finder("text-center"),
    )
    .assign(
        win=lambda x: x["win"].str.split(r"[\+\-]", regex=True).str[0].astype(float),
    )
    .drop(columns="soup")
)

champs_df.to_csv(f"{current_dir}/out.csv", index=False)
