<script lang="ts">
export { default } from "@/components/RegexTransform";
</script>

<template>
	<div
		class="transform transform-regex"
		:class='[{
			"transform-disabled": !modelValue.enabled
		}]'
	>
		<TransformHeader
			:enabled='modelValue.enabled'
			:name='modelValue.name'
			:transform-index='transformIndex'
			:transform-max-index='transformMaxIndex'
			@delete='requestDelete()'
			@move-down='requestMoveDown()'
			@move-up='requestMoveUp()'
			@update:enabled='updateEnabled($event)'
			@update:name='updateName($event)'
		/>
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
					@change='updateFlags()'
					v-model='selected_flags'
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

.transform-regex-button {
	float: right;
}
</style>
