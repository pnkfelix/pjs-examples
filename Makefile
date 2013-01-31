index.html: index.md
	perl Markdown.pl --html4tags $< > $@
