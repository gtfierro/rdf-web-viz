<script lang="ts">
export { default } from "@/components/RegexTransform";
</script>

<template>
	<div class="transform transform-regex">
		<input :id='`transform-${transformIndex}-name`'
			class="transform-regex-name"
			:placeholder='`RegEx Transform #${transformIndex + 1}`'
			:value='modelValue.name'
			@input='updateName($event.target.value)'
		/>
		<button :id='`transform-${transformIndex}-name`'
			class="transform-regex-delete"
			@click='requestDelete()'
		>–</button>
		<br>
		<label :for='`transform-${transformIndex}-pattern`'>Pattern:</label>
		<input :id='`transform-${transformIndex}-pattern`'
			class="transform-regex-pattern"
			:value='modelValue.regex'
			@input='updateRegex($event.target.value)'
		/>
		<br>
		<span>Flags:</span>
		<ul>
			<li v-for='([flag, display_name], index) in valid_flags'
				:key='index'
			>
				<input :id='`transform-${transformIndex}-flag-${flag}`'
					class="transform-regex-flag"
					type="checkbox"
					:checked='modelValue.flags.match(flag) ? true : false'
					:value='flag'
					v-model='selected_flags'
					@change='updateFlags()'
				/>
				<label :for='`transform-${transformIndex}-flag-${flag}`'>{{ display_name }}</label>
			</li>
		</ul>
		<br>
		<label :for='`transform-${transformIndex}-match-over`'>Match over:</label>
		<select :id='`transform-${transformIndex}-match-over`'
			class="transform-regex-match-over"
			:value='modelValue.match_over'
			@change='updateMatchOver($event.target.value)'
		>
				<option v-for='([match_over, display_name], index) in valid_match_overs'
					:key='index'
					:value='match_over'
				>
					{{ display_name }}
				</option>
		</select>
	</div>
</template>

<style>
.transform-regex {
	background-color: orange;
}

.transform-regex ul {
	margin: 0;
}

.transform-regex-delete {
	background-color: rgba(255, 255, 255, .5);
	border: 0;
	float: right;
	font-size: 1rem;
}

.transform-regex-delete:hover {
	background-color: rgba(255, 255, 255, .75);
}
.transform-regex-name {
	background-color: rgba(255, 255, 255, .5);
	border: 0;
	font-size: 1rem;
}

.transform-regex-name:hover {
	background-color: rgba(255, 255, 255, .75);
}
</style>
