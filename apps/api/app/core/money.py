"""Argent : montants entiers en unités mineures. Aucune conversion automatique."""

from dataclasses import dataclass

from fastapi import HTTPException, status


@dataclass(frozen=True, slots=True)
class Money:
    amount_minor: int
    currency_code: str
    minor_units: int


def convert(_amount: int, _from: str, _to: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Aucune conversion automatique de devise n'est autorisée.",
    )


def assert_same_currency(code_a: str, code_b: str) -> None:
    if code_a != code_b:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de mélanger deux devises dans un même total.",
        )


def format_amount(amount_minor: int, currency_code: str, minor_units: int) -> str:
    if minor_units == 0:
        return f"{amount_minor:,} {currency_code}".replace(",", " ")
    scale = 10 ** minor_units
    major, minor = divmod(amount_minor, scale)
    return f"{major},{minor:0{minor_units}d} {currency_code}"
