from src.utils.quote_locator import QuoteLocator

TEXT = "The lease  ends on\n31 December 2027.\nNotice is due 60 days earlier."
PASSAGES = [("The lease ends on 31 December 2027.", 2), ("Notice is due 60 days earlier.", 5)]


def test_a_quote_in_the_text_is_found_whatever_the_spacing_and_case():
    assert QuoteLocator(TEXT, PASSAGES).contains("the LEASE ends on 31 December 2027.")


def test_a_quote_that_is_not_in_the_text_is_not_found():
    assert not QuoteLocator(TEXT, PASSAGES).contains("The lease ends on 1 January 2028.")


def test_an_empty_quote_is_never_found():
    assert not QuoteLocator(TEXT, PASSAGES).contains("   ")


def test_the_page_is_that_of_the_passage_holding_the_quote():
    locator = QuoteLocator(TEXT, PASSAGES)

    assert locator.page_of("Notice is due 60 days") == 5
    assert locator.page_of("ends on 31 December 2027") == 2


def test_a_quote_with_no_matching_passage_has_no_page():
    assert QuoteLocator(TEXT, PASSAGES).page_of("something else") is None


def test_a_quote_shows_the_year_when_it_says_it_in_full_or_as_a_numeric_date():
    assert QuoteLocator.shows_year("The lease ends on 31 December 2027.", 2027)
    assert QuoteLocator.shows_year("Rent is due 3/1/27.", 2027)


def test_a_quote_without_the_year_does_not_show_it():
    assert not QuoteLocator.shows_year("Due Dec 6 at 11:59pm", 2019)
