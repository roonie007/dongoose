test:
	@deno test -A --unstable

test-coverage:
	@rm -rf .coverage > /dev/null
	@deno test -A --unstable --coverage=.coverage/cov_profile  > /dev/null
	@deno coverage .coverage/cov_profile --lcov --output=.coverage/cov_profile.lcov  > /dev/null
	@genhtml -o .coverage/html .coverage/cov_profile.lcov